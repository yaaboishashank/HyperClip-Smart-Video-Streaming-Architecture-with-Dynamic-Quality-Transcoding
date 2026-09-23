import {
  mkdir,
  mkdtemp,
  rm,
  readdir,
  stat,
} from "node:fs/promises";

import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(
  new URL("../../storage/jobs/", import.meta.url)
);

export async function createWorkspace(videoId) {
  await mkdir(root, { recursive: true });

  return mkdtemp(
    path.join(root, `${videoId}-`)
  );
}

export const removeWorkspace = (directory) =>
  rm(directory, {
    recursive: true,
    force: true,
  });

export async function downloadOriginal(
  value,
  directory,
  signal
) {
  const url = new URL(value);

  const prefix =
    `/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/`;

  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(prefix)
  ) {
    throw new Error("Unexpected original video URL.");
  }

  const response = await fetch(url, {
    signal,
    redirect: "error",
  });

  if (!response.ok || !response.body) {
    throw new Error("Original video download failed.");
  }

  let bytes = 0;

  const limit = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;

      callback(
        bytes > 100000000
          ? new Error("Original exceeds 100 MB.")
          : null,
        chunk
      );
    },
  });

  const file = path.join(directory, "original");

  await pipeline(
    Readable.fromWeb(response.body),
    limit,
    createWriteStream(file),
    { signal }
  );

  return file;
}

export async function cleanupOldWorkspaces() {
  await mkdir(root, { recursive: true });

  const entries = await readdir(root, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      !/^[a-f0-9]{24}-/.test(entry.name)
    ) {
      continue;
    }

    const directory = path.join(root, entry.name);
    const details = await stat(directory);

    // Normal jobs have a 15-minute deadline.
    // A directory older than one day is stale.
    if (
      Date.now() - details.mtimeMs >
      24 * 60 * 60 * 1000
    ) {
      await removeWorkspace(directory);
    }
  }
}