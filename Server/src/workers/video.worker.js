import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";

import connectDB from "../db/index.js";
import { Video } from "../models/video.model.js";

import {
  uploadOnCloudinary,
  cleanupMedia,
} from "../utils/cloudinary.js";

import {
  runTool,
  inspectVideo,
  outputProfiles,
  encodeVideo,
} from "../services/transcoding.service.js";

import {
  createWorkspace,
  downloadOriginal,
  removeWorkspace,
  cleanupOldWorkspaces,
} from "../services/media-files.service.js";

const JOB_TIME = 15 * 60 * 1000;
const LEASE_TIME = 20 * 60 * 1000;

let stopping = false;
let currentAbort;

for (const event of ["SIGINT", "SIGTERM"]) {
  process.once(event, () => {
    stopping = true;
    console.log("Stopping video worker...");
    currentAbort?.abort();
  });
}

async function processVideo(video, token) {
  const abort = new AbortController();
  currentAbort = abort;

  const timeout = setTimeout(
    () => abort.abort(),
    JOB_TIME
  );

  const videoId = String(video._id);
  const assets = [...(video.processingAssets || [])];

  let directory;

  async function save(values) {
    abort.signal.throwIfAborted();

    const result = await Video.updateOne(
      {
        _id: video._id,
        processingToken: token,
        processingStatus: "processing",
        leaseUntil: { $gt: new Date() },
      },
      { $set: values }
    );

    if (!result.matchedCount) {
      throw new Error("Processing ownership lost.");
    }
  }

  async function stage(message) {
    await save({ processingStage: message });
    console.log(`[${videoId}] ${message}`);
  }

  try {
    console.log(`[${videoId}] Starting: ${video.title}`);

    if (assets.length) {
      await stage("Cleaning previous outputs");

      const cleanupFailed = await cleanupMedia(
        assets.map((publicId) => ({
          publicId,
          type: "video",
        }))
      );

      if (cleanupFailed) {
        throw new Error("Previous output cleanup failed.");
      }
    }

    assets.length = 0;
    await save({ processingAssets: [] });

    await stage("Downloading original");

    directory = await createWorkspace(videoId);

    const input = await downloadOriginal(
      video.videoFile,
      directory,
      abort.signal
    );

    await stage("Checking video");

    const info = await inspectVideo(
      input,
      abort.signal
    );

    const profiles = outputProfiles(info);

    if (!profiles.length) {
      throw new Error("No output qualities could be generated.");
    }

    console.log(
      `[${videoId}] Source: ${info.width}x${info.height}`
    );

    console.log(
      `[${videoId}] Qualities: ${profiles
        .map((profile) => profile.label)
        .join(", ")}`
    );

    const variants = [];

    for (const profile of profiles) {
      await stage(`Encoding ${profile.label}`);

      const output = await encodeVideo(
        input,
        directory,
        profile,
        info,
        abort.signal
      );

      const details = await stat(output);

      if (!details.size || details.size > 100000000) {
        throw new Error(
          "Generated file is empty or exceeds 100 MB."
        );
      }

      const publicId =
        `hyperclip/variants/${videoId}/${token}/${profile.label}`;

      assets.push(publicId);

      // Record the planned remote ID before uploading.
      await save({
        processingAssets: [...assets],
        processingStage: `Uploading ${profile.label}`,
      });

      console.log(
        `[${videoId}] Uploading ${profile.label}`
      );

      const media = await uploadOnCloudinary(output, {
        publicId,
        keepLocal: true,
      });

      abort.signal.throwIfAborted();

      if (!media?.secure_url || !media.public_id) {
        throw new Error("Output upload failed.");
      }

      variants.push({
        ...profile,
        url: media.secure_url,
        publicId: media.public_id,
        bytes: media.bytes ?? details.size,
      });
    }

    await save({
      variants,
      duration: info.duration,
      processingStatus: "ready",
      processingStage: "Completed",
      processingError: "",
      processingAssets: [],
      processingToken: null,
      leaseUntil: null,
      isPublished: true,
    });

    console.log(
      `[${videoId}] Ready: ${variants
        .map((variant) => variant.label)
        .join(", ")}`
    );
  } catch (error) {
    console.error(
      `[${videoId}] Processing failed:`,
      error.message
    );

    try {
      await Video.updateOne(
        {
          _id: video._id,
          processingToken: token,
          processingStatus: "processing",
        },
        {
          $set: {
            processingStatus: "failed",
            processingStage: stopping ? "Interrupted" : "Failed",
            processingError: stopping
              ? "Worker stopped. Retry processing from Studio."
              : abort.signal.aborted
                ? "Processing exceeded 15 minutes. Try a shorter video."
                : "Processing failed. Check the worker terminal, then retry.",
            processingToken: null,
            leaseUntil: null,
          },
        }
      );

      // Keep the saved asset IDs.
      // The next retry or video deletion will clean them.
      // This avoids deleting files while a retry is starting.
    } catch (databaseError) {
      console.error(
        `[${videoId}] Could not save failure status:`,
        databaseError.message
      );
    }
  } finally {
    clearTimeout(timeout);
    currentAbort = null;

    if (directory) {
      // Retry short-lived Windows directory locks.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await removeWorkspace(directory);
          break;
        } catch (error) {
          if (attempt === 3) {
            console.error(
              "Workspace cleanup failed:",
              directory,
              error.message
            );
          } else {
            await pause(500 * (attempt + 1));
          }
        }
      }
    }
  }
}

async function main() {
  mongoose.set("bufferCommands", false);

  for (const key of [
    "MONGODB_URI",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    if (!process.env[key]?.trim()) {
      throw new Error(`Missing ${key}`);
    }
  }

  await runTool(
    process.env.FFMPEG_PATH || "ffmpeg",
    ["-version"],
    AbortSignal.timeout(10000)
  );

  await runTool(
    process.env.FFPROBE_PATH || "ffprobe",
    ["-version"],
    AbortSignal.timeout(10000)
  );

  try {
    await connectDB();
    await Video.init();

    await cleanupOldWorkspaces().catch((error) => {
      console.error(
        "Old workspace cleanup:",
        error.message
      );
    });

    console.log(
      "Video worker running. One job at a time."
    );

    while (!stopping) {
      try {
        await Video.updateMany(
          {
            processingStatus: "processing",
            leaseUntil: { $lt: new Date() },
          },
          {
            $set: {
              processingStatus: "failed",
              processingStage: "Interrupted",
              processingError:
                "Previous worker stopped. Retry processing.",
              processingToken: null,
              leaseUntil: null,
            },
          }
        );

        if (stopping) break;

        const token = randomUUID();

        const video = await Video.findOneAndUpdate(
          { processingStatus: "pending" },
          {
            $set: {
              processingStatus: "processing",
              processingToken: token,
              leaseUntil: new Date(Date.now() + LEASE_TIME),
              processingStage: "Starting",
              processingError: "",
            },
            $inc: { processingAttempts: 1 },
          },
          {
            sort: { createdAt: 1 },
            new: true,
          }
        ).select("+processingAssets");

        if (!video) {
          if (!stopping) await pause(3000);
          continue;
        }

        // A stop signal can arrive while the database claim runs.
        if (stopping) {
          await Video.updateOne(
            {
              _id: video._id,
              processingToken: token,
              processingStatus: "processing",
            },
            {
              $set: {
                processingStatus: "pending",
                processingStage: "Waiting for worker",
                processingToken: null,
                leaseUntil: null,
              },
            }
          );

          break;
        }

        await processVideo(video, token);
      } catch (error) {
        console.error("Worker:", error.message);

        if (!stopping) {
          await pause(5000);
        }
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log("Video worker stopped.");
}

main().catch((error) => {
  console.error(
    "Worker startup failed:",
    error.message
  );

  process.exitCode = 1;
});