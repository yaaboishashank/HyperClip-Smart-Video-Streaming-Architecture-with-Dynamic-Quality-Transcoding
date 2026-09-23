import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const checkId = (id) => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid ID");
  }
};

const readContent = (value) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 1000
  ) {
    throw new ApiError(400, "Comment must contain 1 to 1000 characters");
  }

  return value.trim();
};

const readPagination = (query) => {
  const { page = "1", limit = "10" } = query;

  if (
    typeof page !== "string" ||
    typeof limit !== "string" ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(limit) ||
    Number(page) > 10000 ||
    Number(limit) > 50
  ) {
    throw new ApiError(400, "Page must be 1–10000 and limit 1–50");
  }

  return { page: Number(page), limit: Number(limit) };
};

const requireVideoAccess = async (videoId, userId) => {
  checkId(videoId);

  const video = await Video.exists({
    _id: videoId,
    $or: [{ isPublished: true }, { owner: userId }],
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
};

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page, limit } = readPagination(req.query);

  await requireVideoAccess(videoId, req.user._id);

  const filter = { video: videoId };

  const [comments, totalComments] = await Promise.all([
    Comment.find(filter)
      .populate("owner", "username fullName avatar")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        page,
        limit,
        totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const content = readContent(req.body?.content);

  await requireVideoAccess(req.params.videoId, req.user._id);

  const comment = await Comment.create({
    content,
    video: req.params.videoId,
    owner: req.user._id,
  });

  await comment.populate("owner", "username fullName avatar");

  return res.status(201).json(
    new ApiResponse(201, comment, "Comment added successfully")
  );
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  checkId(commentId);

  const content = readContent(req.body?.content);
  const existing = await Comment.findById(commentId);

  if (!existing) {
    throw new ApiError(404, "Comment not found");
  }

  if (String(existing.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  await requireVideoAccess(String(existing.video), req.user._id);

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: req.user._id },
    { $set: { content } },
    { new: true, runValidators: true }
  ).populate("owner", "username fullName avatar");

  if (!comment) {
    throw new ApiError(404, "Comment no longer exists");
  }

  return res.status(200).json(
    new ApiResponse(200, comment, "Comment updated successfully")
  );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  checkId(commentId);

  const existing = await Comment.findById(commentId);

  if (!existing) {
    throw new ApiError(404, "Comment not found");
  }

  if (String(existing.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await mongoose.connection.transaction(async (session) => {
    const deleted = await Comment.findOneAndDelete(
      { _id: commentId, owner: req.user._id },
      { session }
    );

    if (!deleted) {
      throw new ApiError(404, "Comment no longer exists");
    }

    await Like.deleteMany({ comment: commentId }, { session });
  });

  return res.status(200).json(
    new ApiResponse(200, { commentId }, "Comment deleted successfully")
  );
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
};