import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  checkId,
  readText,
  readPagination,
  getOwnedDocument,
} from "../utils/validation.js";

const publicFields = "username fullName avatar";

const createTweet = asyncHandler(async (req, res) => {
  const content = readText(req.body?.content, "Content", 1000);

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  await tweet.populate("owner", publicFields);

  return res.status(201).json(
    new ApiResponse(201, tweet, "Post created successfully")
  );
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  checkId(userId);

  const { page, limit } = readPagination(req.query);

  if (!(await User.exists({ _id: userId }))) {
    throw new ApiError(404, "User not found");
  }

  const filter = { owner: userId };

  const [tweets, totalTweets] = await Promise.all([
    Tweet.find(filter)
      .populate("owner", publicFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tweet.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        page,
        limit,
        totalTweets,
        totalPages: Math.ceil(totalTweets / limit),
      },
      "Posts fetched successfully"
    )
  );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const content = readText(req.body?.content, "Content", 1000);

  await getOwnedDocument(Tweet, tweetId, req.user._id, "post");

  const tweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user._id },
    { $set: { content } },
    { new: true, runValidators: true }
  ).populate("owner", publicFields);

  if (!tweet) {
    throw new ApiError(404, "Post no longer exists");
  }

  return res.status(200).json(
    new ApiResponse(200, tweet, "Post updated successfully")
  );
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  await getOwnedDocument(Tweet, tweetId, req.user._id, "post");

  await mongoose.connection.transaction(async (session) => {
    const deleted = await Tweet.findOneAndDelete(
      { _id: tweetId, owner: req.user._id },
      { session }
    );

    if (!deleted) {
      throw new ApiError(404, "Post no longer exists");
    }

    await Like.deleteMany({ tweet: tweetId }, { session });
  });

  return res.status(200).json(
    new ApiResponse(200, { tweetId }, "Post deleted successfully")
  );
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
};