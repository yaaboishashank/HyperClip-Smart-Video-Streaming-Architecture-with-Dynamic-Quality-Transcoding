import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkId, readText } from "../utils/validation.js";

const publicFields = "username fullName avatar coverImage";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const safeUser = (user) => {
  const result = user.toObject();
  delete result.password;
  delete result.refreshToken;
  return result;
};

const readEmail = (value) => {
  const email = readText(value, "Email", 254).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Enter a valid email address");
  }

  return email;
};

const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.trim().length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new ApiError(
      400,
      "Password must contain at least 8 non-padding characters and be at most 72 bytes"
    );
  }
};

const createTokens = (user) => ({
  accessToken: user.generateAccessToken(),
  refreshToken: user.generateRefreshToken(),
});

const sendTokens = (res, tokens, data, message) => {
  const options = getCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", tokens.accessToken, options)
    .cookie("refreshToken", tokens.refreshToken, options)
    .json(new ApiResponse(200, { ...data, ...tokens }, message));
};

const cleanupImage = async (publicId) => {
  if (!publicId) return;

  try {
    await deleteFromCloudinary(publicId, "image");
  } catch {
    console.error("Image cleanup needs manual retry:", publicId);
  }
};

const validateUploadedImage = (image) => {
  if (!image?.secure_url || !image?.public_id) {
    throw new ApiError(502, "Image upload failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const fullName = readText(req.body?.fullName, "Full name", 100);
  const username = readText(
    req.body?.username,
    "Username",
    50
  ).toLowerCase();
  const email = readEmail(req.body?.email);
  const password = req.body?.password;

  validatePassword(password);

  if (
    await User.exists({
      $or: [{ email }, { username }],
    })
  ) {
    throw new ApiError(409, "Email or username already exists");
  }

  const avatarPath = req.files?.avatar?.[0]?.path;
  const coverPath = req.files?.coverImage?.[0]?.path;

  if (!avatarPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  let avatar;
  let cover;
  let user;

  try {
    avatar = await uploadOnCloudinary(avatarPath);
    validateUploadedImage(avatar);

    if (coverPath) {
      cover = await uploadOnCloudinary(coverPath);
      validateUploadedImage(cover);
    }

    user = await User.create({
      fullName,
      username,
      email,
      password,
      avatar: avatar.secure_url,
      avatarPublicId: avatar.public_id,
      coverImage: cover?.secure_url || "",
      coverImagePublicId: cover?.public_id,
    });
  } catch (error) {
    await Promise.all([
      cleanupImage(avatar?.public_id),
      cleanupImage(cover?.public_id),
    ]);

    throw error;
  }

  return res.status(201).json(
    new ApiResponse(201, safeUser(user), "User registered successfully")
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body ?? {};

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  const normalizedUsername =
    typeof username === "string" ? username.trim().toLowerCase() : "";

  if (!normalizedEmail && !normalizedUsername) {
    throw new ApiError(400, "Email or username is required");
  }

  if (
    typeof password !== "string" ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new ApiError(400, "Enter a valid password");
  }

  const user = await User.findOne(
    normalizedEmail
      ? { email: normalizedEmail }
      : { username: normalizedUsername }
  );

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid email, username or password");
  }

  const tokens = createTokens(user);

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { refreshToken: tokens.refreshToken } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(401, "User no longer exists");
  }

  return sendTokens(
    res,
    tokens,
    { user: safeUser(updated) },
    "User logged in successfully"
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $unset: { refreshToken: 1 } }
  );

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken =
    req.body?.refreshToken ?? req.cookies?.refreshToken;

  if (typeof incomingToken !== "string" || !incomingToken.trim()) {
    throw new ApiError(401, "Refresh token is required");
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new ApiError(500, "Refresh token secret is not configured");
  }

  let decoded;

  try {
    decoded = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (error) {
    if (
      ["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"]
        .includes(error.name)
    ) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    throw error;
  }

  if (
    typeof decoded?._id !== "string" ||
    !mongoose.isValidObjectId(decoded._id)
  ) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findOne({
    _id: decoded._id,
    refreshToken: incomingToken,
  });

  if (!user) {
    throw new ApiError(401, "Refresh token is invalid or already used");
  }

  const tokens = createTokens(user);

  // Only one request can replace this particular refresh token.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, refreshToken: incomingToken },
    { $set: { refreshToken: tokens.refreshToken } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(401, "Refresh token is invalid or already used");
  }

  return sendTokens(res, tokens, {}, "Access token refreshed");
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};

  if (
    typeof oldPassword !== "string" ||
    !oldPassword ||
    Buffer.byteLength(oldPassword, "utf8") > 72
  ) {
    throw new ApiError(400, "Enter a valid old password");
  }

  validatePassword(newPassword);

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must differ from old password");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please login again"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, req.user, "User fetched successfully")
  );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body?.fullName !== undefined) {
    updates.fullName = readText(req.body.fullName, "Full name", 100);
  }

  if (req.body?.email !== undefined) {
    updates.email = readEmail(req.body.email);
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, "Provide fullName or email");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "Account details updated successfully")
  );
});

const updateProfileImage = (field) =>
  asyncHandler(async (req, res) => {
    if (!req.file?.path) {
      throw new ApiError(400, "Image file is required");
    }

    const publicIdField = `${field}PublicId`;
    const existing = await User.findById(req.user._id);

    if (!existing) {
      throw new ApiError(404, "User not found");
    }

    let image;
    let user;

    try {
      image = await uploadOnCloudinary(req.file.path);
      validateUploadedImage(image);

      const expectedValue =
        existing[field] === undefined
          ? { $exists: false }
          : existing[field];

      user = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          [field]: expectedValue,
        },
        {
          $set: {
            [field]: image.secure_url,
            [publicIdField]: image.public_id,
          },
        },
        { new: true, runValidators: true }
      ).select("-password -refreshToken");

      if (!user) {
        throw new ApiError(409, "Profile changed. Refresh and retry");
      }
    } catch (error) {
      await cleanupImage(image?.public_id);
      throw error;
    }

    await cleanupImage(existing[publicIdField]);

    return res.status(200).json(
      new ApiResponse(200, user, "Profile image updated successfully")
    );
  });

const updateUserAvatar = updateProfileImage("avatar");
const updateUserCoverImage = updateProfileImage("coverImage");

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const username = readText(
    req.params.username,
    "Username",
    50
  ).toLowerCase();

  const channel = await User.findOne({ username })
    .select(publicFields)
    .lean();

  if (!channel) {
    throw new ApiError(404, "Channel does not exist");
  }

  const [
    subscribersCount,
    channelsSubscribedToCount,
    subscription,
  ] = await Promise.all([
    Subscription.countDocuments({ channel: channel._id }),
    Subscription.countDocuments({ subscriber: channel._id }),
    Subscription.exists({
      channel: channel._id,
      subscriber: req.user._id,
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...channel,
        subscribersCount,
        channelsSubscribedToCount,
        isSubscribed: Boolean(subscription),
      },
      "User channel fetched successfully"
    )
  );
});

const recordWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  checkId(videoId);

  const viewerId = new mongoose.Types.ObjectId(
    String(req.user._id)
  );

  const result = await mongoose.connection.transaction(
    async (session) => {
      const accessFilter = {
        _id: videoId,
        $or: [
          { isPublished: true },
          { owner: viewerId },
        ],
      };

      const existing = await Video.findOne(accessFilter)
        .select("_id views processingStatus")
        .session(session);

      if (!existing) {
        throw new ApiError(404, "Video not found");
      }

      if (
        existing.processingStatus &&
        existing.processingStatus !== "ready"
      ) {
        throw new ApiError(
          409,
          "Video is not ready for playback"
        );
      }

      // Increment only if this account has never been counted.
      // The condition and both updates run atomically.
      const countedVideo = await Video.findOneAndUpdate(
        {
          ...accessFilter,
          viewedBy: { $ne: viewerId },
        },
        {
          $addToSet: { viewedBy: viewerId },
          $inc: { views: 1 },
        },
        {
          new: true,
          session,
        }
      ).select("_id views");

      const currentVideo = countedVideo || existing;

      // Update recent history on every watch.
      // History remains separate from permanent view counting.
      const historyResult = await User.updateOne(
        { _id: viewerId },
        [
          {
            $set: {
              watchHistory: {
                $slice: [
                  {
                    $concatArrays: [
                      [currentVideo._id],
                      {
                        $filter: {
                          input: {
                            $ifNull: ["$watchHistory", []],
                          },
                          as: "id",
                          cond: {
                            $ne: ["$$id", currentVideo._id],
                          },
                        },
                      },
                    ],
                  },
                  100,
                ],
              },
            },
          },
        ],
        { session }
      );

      if (!historyResult.matchedCount) {
        throw new ApiError(404, "User not found");
      }

      return {
        videoId: currentVideo._id,
        views: currentVideo.views,
        counted: Boolean(countedVideo),
      };
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      result.counted
        ? "View counted and watch history updated"
        : "Already counted. Watch history updated"
    )
  );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("watchHistory")
    .populate({
      path: "watchHistory",
      match: {
        $or: [
          { isPublished: true },
          { owner: req.user._id },
        ],
      },
      select: "title description thumbnail videoFile duration views owner createdAt",
      populate: {
        path: "owner",
        select: "username fullName avatar",
      },
    });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      user.watchHistory,
      "Watch history fetched successfully"
    )
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  recordWatchHistory,
};