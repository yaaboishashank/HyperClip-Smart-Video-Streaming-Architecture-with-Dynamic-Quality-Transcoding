import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const checkId = (id) => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid ID");
  }
};

const requireVideoAccess = async (videoId, userId) => {
  const video = await Video.exists({
    _id: videoId,
    $or: [{ isPublished: true }, { owner: userId }],
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
};

const toggleLike = async (field, itemId, userId) => {
  const filter = { [field]: itemId, likedBy: userId };
  const removed = await Like.findOneAndDelete(filter);

  if (removed) return false;

  try {
    await Like.create(filter);
  } catch (error) {
    // A simultaneous request may have already created this like.
    if (error.code !== 11000) throw error;
  }

  return true;
};

const sendLikeResponse = async (res, field, itemId, isLiked) => {
  const likesCount = await Like.countDocuments({ [field]: itemId });

  return res.status(200).json(
    new ApiResponse(
      200,
      { isLiked, likesCount },
      isLiked ? "Like added" : "Like removed"
    )
  );
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  checkId(videoId);

  await requireVideoAccess(videoId, req.user._id);

  const isLiked = await toggleLike("video", videoId, req.user._id);

  return sendLikeResponse(res, "video", videoId, isLiked);
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  checkId(commentId);

  const comment = await Comment.findById(commentId).select("video");

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  await requireVideoAccess(comment.video, req.user._id);

  const isLiked = await toggleLike("comment", commentId, req.user._id);

  return sendLikeResponse(res, "comment", commentId, isLiked);
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  checkId(tweetId);

  const tweet = await Tweet.exists({ _id: tweetId });

  if (!tweet) {
    throw new ApiError(404, "Post not found");
  }

  const isLiked = await toggleLike("tweet", tweetId, req.user._id);

  return sendLikeResponse(res, "tweet", tweetId, isLiked);
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = "1", limit = "10" } = req.query;

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

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  const [result] = await Like.aggregate([
    {
      $match: {
        likedBy: req.user._id,
        video: { $type: "objectId" },
      },
    },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $lookup: {
        from: Video.collection.name,
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    {
      $match: {
        $or: [
          { "video.isPublished": true },
          { "video.owner": req.user._id },
        ],
      },
    },
    {
      $facet: {
        videos: [
          { $skip: (pageNumber - 1) * pageSize },
          { $limit: pageSize },
          { $replaceRoot: { newRoot: "$video" } },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const videos = await Video.populate(result.videos, {
    path: "owner",
    select: "username fullName avatar",
  });

  const totalVideos = result.total[0]?.count ?? 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: pageNumber,
        limit: pageSize,
        totalVideos,
        totalPages: Math.ceil(totalVideos / pageSize),
      },
      "Liked videos fetched successfully"
    )
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};