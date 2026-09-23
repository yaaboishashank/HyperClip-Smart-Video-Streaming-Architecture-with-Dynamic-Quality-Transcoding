import { v2 as cloudinary } from "cloudinary";
import { unlink } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import path from "node:path";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pendingCleanups = new Map();

export async function removeLocalFile(file) {
  if (!file) return;

  const filePath = path.resolve(file);

  if (pendingCleanups.has(filePath)) {
    return pendingCleanups.get(filePath);
  }

  const task = (async () => {
    const delays = [0, 250, 500, 1000, 2000, 3000];

    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]) {
        await pause(delays[attempt]);
      }

      try {
        await unlink(filePath);
        return;
      } catch (error) {
        if (error.code === "ENOENT") return;

        const retryable = ["EPERM", "EBUSY", "EACCES"].includes(
          error.code
        );

        if (!retryable || attempt === delays.length - 1) {
          console.error(
            "Temporary cleanup failed:",
            error.code,
            filePath
          );
          return;
        }
      }
    }
  })();

  pendingCleanups.set(filePath, task);

  try {
    await task;
  } finally {
    pendingCleanups.delete(filePath);
  }
}

export async function uploadOnCloudinary(
  file,
  { publicId, keepLocal = false } = {}
) {
  if (!file) return null;

  const isVideo = [".mp4", ".webm", ".mov"].includes(
    path.extname(file).toLowerCase()
  );

  try {
    return await cloudinary.uploader.upload(file, {
      resource_type: isVideo ? "video" : "image",

      allowed_formats: isVideo
        ? ["mp4", "webm", "mov"]
        : ["jpg", "jpeg", "png", "webp"],

      ...(publicId
        ? { public_id: publicId, overwrite: true }
        : { folder: "hyperclip" }),

      timeout: 180000,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", {
      code: error.http_code || error.code || "UNKNOWN",
      message: error.message,
      file: path.basename(file),
    });

    const uploadError = new ApiError(
      502,
      "Media upload could not be completed. Please try again shortly."
    );

    // This message is safe to display to the frontend.
    uploadError.expose = true;
    throw uploadError;
  } finally {
    if (!keepLocal) {
      await removeLocalFile(file);
    }
  }
}

export async function deleteFromCloudinary(
  publicId,
  resourceType = "image"
) {
  if (!publicId) return;

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
    timeout: 120000,
  });

  if (!["ok", "not found"].includes(result.result)) {
    throw new ApiError(502, "Media cleanup failed.");
  }

  return result;
}

export async function cleanupMedia(assets = []) {
  const valid = assets.filter((asset) => asset?.publicId);

  const results = await Promise.allSettled(
    valid.map((asset) =>
      deleteFromCloudinary(asset.publicId, asset.type)
    )
  );

  const failed = valid.filter(
    (_, index) => results[index].status === "rejected"
  );

  if (failed.length) {
    console.error("Media cleanup needs manual retry:", failed);
  }

  return failed.length > 0;
}