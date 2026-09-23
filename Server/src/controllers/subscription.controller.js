import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const publicFields = "username fullName avatar";

const requireUser = async (id) => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.exists({ _id: id });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
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

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  await requireUser(channelId);

  if (String(req.user._id) === channelId.toLowerCase()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const filter = {
    subscriber: req.user._id,
    channel: channelId,
  };

  const removed = await Subscription.findOneAndDelete(filter);
  const isSubscribed = !removed;

  if (isSubscribed) {
    try {
      await Subscription.create(filter);
    } catch (error) {
      // Prevent duplicates from simultaneous requests.
      if (error.code !== 11000) throw error;
    }
  }

  const subscribersCount = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { isSubscribed, subscribersCount },
      isSubscribed ? "Subscribed successfully" : "Unsubscribed successfully"
    )
  );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page, limit } = readPagination(req.query);

  await requireUser(channelId);

  const filter = { channel: channelId };

  const [subscriptions, totalSubscribers] = await Promise.all([
    Subscription.find(filter)
      .populate("subscriber", publicFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  const subscribers = subscriptions
    .map((subscription) => subscription.subscriber)
    .filter(Boolean);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
        page,
        limit,
        totalSubscribers,
        totalPages: Math.ceil(totalSubscribers / limit),
      },
      "Subscribers fetched successfully"
    )
  );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page, limit } = readPagination(req.query);

  await requireUser(subscriberId);

  const filter = { subscriber: subscriberId };

  const [subscriptions, totalChannels] = await Promise.all([
    Subscription.find(filter)
      .populate("channel", publicFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  const channels = subscriptions
    .map((subscription) => subscription.channel)
    .filter(Boolean);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channels,
        page,
        limit,
        totalChannels,
        totalPages: Math.ceil(totalChannels / limit),
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};