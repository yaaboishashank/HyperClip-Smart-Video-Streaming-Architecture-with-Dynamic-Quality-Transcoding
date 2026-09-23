import mongoose, { isValidObjectId } from "mongoose";

import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  uploadOnCloudinary,
  cleanupMedia,
} from "../utils/cloudinary.js";

const ownerFields = "username fullName avatar";

function checkId(value) {
  if (typeof value !== "string" || !isValidObjectId(value)) {
    throw new ApiError(400, "Invalid video or user ID.");
  }
}

function readText(value, name, maxLength) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new ApiError(
      400,
      `${name} is required and must be at most ${maxLength} characters.`
    );
  }

  return value.trim();
}

function readInteger(value, fallback, max) {
  if (value === undefined) return fallback;

  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > max
  ) {
    throw new ApiError(
      400,
      `Use a whole number between 1 and ${max}.`
    );
  }

  return Number(value);
}

async function getOwnedVideo(videoId, userId) {
  checkId(videoId);

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  if (String(video.owner) !== String(userId)) {
    throw new ApiError(
      403,
      "Only the owner can change this video."
    );
  }

  return video;
}

const getAllVideos = asyncHandler(async (req, res) => {
  const page = readInteger(req.query.page, 1, 10000);
  const limit = readInteger(req.query.limit, 10, 50);

  const {
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  if (typeof query !== "string" || query.length > 100) {
    throw new ApiError(
      400,
      "Search must be at most 100 characters."
    );
  }

  if (
    !["createdAt", "views", "duration", "title"].includes(sortBy) ||
    !["asc", "desc"].includes(sortType)
  ) {
    throw new ApiError(400, "Invalid sortBy or sortType.");
  }

  const filter = { isPublished: true };

  if (userId !== undefined) {
    checkId(userId);
    filter.owner = userId;

    if (userId.toLowerCase() === String(req.user._id)) {
      delete filter.isPublished;
    }
  }

  if (query.trim()) {
    const escaped = query
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
  }

  const [videos, totalVideos] = await Promise.all([
    Video.find(filter)
      .populate("owner", ownerFields)
      .sort({
        [sortBy]: sortType === "asc" ? 1 : -1,
        _id: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Video.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(
      200,
      {
        videos,
        page,
        limit,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "Videos fetched successfully."
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const title = readText(req.body?.title, "Title", 120);

  const description = readText(
    req.body?.description,
    "Description",
    5000
  );

  const videoPath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!videoPath || !thumbnailPath) {
    throw new ApiError(
      400,
      "Video file and thumbnail are required."
    );
  }

  let media;
  let thumbnail;
  let video;

  try {
    media = await uploadOnCloudinary(videoPath);

    if (
      !media?.secure_url ||
      !media.public_id ||
      !Number.isFinite(media.duration) ||
      media.duration <= 0 ||
      !(media.width > 0 && media.height > 0)
    ) {
      throw new ApiError(
        400,
        "Upload a valid video with a visual track."
      );
    }

    if (media.duration > 600) {
      throw new ApiError(
        400,
        "Video must be 10 minutes or shorter."
      );
    }

    thumbnail = await uploadOnCloudinary(thumbnailPath);

    if (!thumbnail?.secure_url || !thumbnail.public_id) {
      throw new ApiError(502, "Thumbnail upload failed.");
    }

    video = await Video.create({
      title,
      description,
      videoFile: media.secure_url,
      videoPublicId: media.public_id,
      thumbnail: thumbnail.secure_url,
      thumbnailPublicId: thumbnail.public_id,
      duration: media.duration,
      owner: req.user._id,
      isPublished: false,
      processingStatus: "pending",
      processingStage: "Waiting for worker",
    });
  } catch (error) {
    await cleanupMedia([
      { publicId: media?.public_id, type: "video" },
      { publicId: thumbnail?.public_id, type: "image" },
    ]);

    throw error;
  }

  // Internal viewer IDs should not be included in the response.
  const result = video.toObject();
  delete result.viewedBy;
  delete result.processingToken;
  delete result.leaseUntil;
  delete result.processingAssets;

  return res.status(202).json(
    new ApiResponse(
      202,
      result,
      "Upload saved. Processing will start shortly."
    )
  );
});

const getVideoById = asyncHandler(async (req, res) => {
  checkId(req.params.videoId);

  const video = await Video.findOne({
    _id: req.params.videoId,
    $or: [
      { isPublished: true },
      { owner: req.user._id },
    ],
  }).populate("owner", ownerFields);

  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  // Views are recorded separately by recordWatchHistory.
  return res.json(
    new ApiResponse(
      200,
      video,
      "Video fetched successfully."
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const existing = await getOwnedVideo(
    req.params.videoId,
    req.user._id
  );

  const updates = {};

  if (req.body?.title !== undefined) {
    updates.title = readText(req.body.title, "Title", 120);
  }

  if (req.body?.description !== undefined) {
    updates.description = readText(
      req.body.description,
      "Description",
      5000
    );
  }

  if (!Object.keys(updates).length && !req.file) {
    throw new ApiError(
      400,
      "Provide title, description or thumbnail."
    );
  }

  let thumbnail;
  let video;

  try {
    if (req.file) {
      thumbnail = await uploadOnCloudinary(req.file.path);

      if (!thumbnail?.secure_url || !thumbnail.public_id) {
        throw new ApiError(502, "Thumbnail upload failed.");
      }

      updates.thumbnail = thumbnail.secure_url;
      updates.thumbnailPublicId = thumbnail.public_id;
    }

    video = await Video.findOneAndUpdate(
      {
        _id: existing._id,
        owner: req.user._id,
        __v: existing.__v,
      },
      {
        $set: updates,
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!video) {
      throw new ApiError(
        409,
        "Video changed or was deleted. Refresh and retry."
      );
    }
  } catch (error) {
    await cleanupMedia([
      { publicId: thumbnail?.public_id, type: "image" },
    ]);

    throw error;
  }

  const mediaCleanupPending = thumbnail
    ? await cleanupMedia([
        {
          publicId: existing.thumbnailPublicId,
          type: "image",
        },
      ])
    : false;

  return res.json(
    new ApiResponse(
      200,
      { video, mediaCleanupPending },
      "Video updated successfully."
    )
  );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const existing = await getOwnedVideo(
    req.params.videoId,
    req.user._id
  );

  if ((existing.processingStatus || "ready") !== "ready") {
    throw new ApiError(
      409,
      "Wait until processing is ready."
    );
  }

  const video = await Video.findOneAndUpdate(
    {
      _id: existing._id,
      owner: req.user._id,
      __v: existing.__v,
      processingStatus: {
        $nin: ["pending", "processing", "failed"],
      },
    },
    {
      $set: { isPublished: !existing.isPublished },
      $inc: { __v: 1 },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!video) {
    throw new ApiError(
      409,
      "Video changed or was deleted. Refresh and retry."
    );
  }

  return res.json(
    new ApiResponse(
      200,
      video,
      video.isPublished
        ? "Video published."
        : "Video unpublished."
    )
  );
});

const deleteVideo = asyncHandler(async (req, res) => {
  await getOwnedVideo(req.params.videoId, req.user._id);

  const video = await mongoose.connection.transaction(
    async (session) => {
      const deleted = await Video.findOneAndDelete(
        {
          _id: req.params.videoId,
          owner: req.user._id,
          processingStatus: { $ne: "processing" },
        },
        { session }
      ).select("+processingAssets");

      if (!deleted) {
        throw new ApiError(
          409,
          "Video is processing or was already deleted. Refresh and retry."
        );
      }

      const comments = await Comment.find({
        video: deleted._id,
      })
        .select("_id")
        .session(session)
        .lean();

      await Like.deleteMany(
        {
          $or: [
            { video: deleted._id },
            {
              comment: {
                $in: comments.map((comment) => comment._id),
              },
            },
          ],
        },
        { session }
      );

      await Comment.deleteMany(
        { video: deleted._id },
        { session }
      );

      await Playlist.updateMany(
        { videos: deleted._id },
        { $pull: { videos: deleted._id } },
        { session }
      );

      await User.updateMany(
        { watchHistory: deleted._id },
        { $pull: { watchHistory: deleted._id } },
        { session }
      );

      return deleted;
    }
  );

  const mediaCleanupPending = await cleanupMedia([
    { publicId: video.videoPublicId, type: "video" },
    { publicId: video.thumbnailPublicId, type: "image" },

    ...(video.variants || []).map((variant) => ({
      publicId: variant.publicId,
      type: "video",
    })),

    ...(video.processingAssets || []).map((publicId) => ({
      publicId,
      type: "video",
    })),
  ]);

  return res.json(
    new ApiResponse(
      200,
      { mediaCleanupPending },
      "Video deleted successfully."
    )
  );
});

const getProcessingStatus = asyncHandler(async (req, res) => {
  const video = await getOwnedVideo(
    req.params.videoId,
    req.user._id
  );

  return res.json(
    new ApiResponse(
      200,
      {
        _id: video._id,
        processingStatus: video.processingStatus || "ready",
        processingStage: video.processingStage,
        processingError: video.processingError,
        variants: video.variants,
      },
      "Processing status fetched."
    )
  );
});

const retryProcessing = asyncHandler(async (req, res) => {
  await getOwnedVideo(req.params.videoId, req.user._id);

  const video = await Video.findOneAndUpdate(
    {
      _id: req.params.videoId,
      owner: req.user._id,
      processingStatus: "failed",
    },
    {
      $set: {
        processingStatus: "pending",
        processingStage: "Waiting for worker",
        processingError: "",
        processingToken: null,
        leaseUntil: null,
        isPublished: false,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(
      409,
      "Only failed videos can be retried."
    );
  }

  return res.status(202).json(
    new ApiResponse(
      202,
      video,
      "Retry requested."
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  togglePublishStatus,
  deleteVideo,
  getProcessingStatus,
  retryProcessing,
};