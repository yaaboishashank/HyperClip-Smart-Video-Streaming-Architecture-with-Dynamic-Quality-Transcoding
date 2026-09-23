import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { readPagination } from "../utils/validation.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const [statistics, totalSubscribers] = await Promise.all([
    Video.aggregate([
      { $match: { owner: req.user._id } },
      {
        $lookup: {
          from: Like.collection.name,
          let: { videoId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$video", "$$videoId"] },
              },
            },
            { $count: "count" },
          ],
          as: "likeCount",
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          publishedVideos: {
            $sum: { $cond: ["$isPublished", 1, 0] },
          },
          totalLikes: {
            $sum: {
              $ifNull: [
                { $arrayElemAt: ["$likeCount.count", 0] },
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Subscription.countDocuments({ channel: req.user._id }),
  ]);

  const stats = statistics[0] || {
    totalVideos: 0,
    totalViews: 0,
    publishedVideos: 0,
    totalLikes: 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      { ...stats, totalSubscribers },
      "Channel statistics fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const filter = { owner: req.user._id };

  const [videos, totalVideos] = await Promise.all([
    Video.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Video.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page,
        limit,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "Channel videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };