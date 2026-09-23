import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authorization = req.get("Authorization");
  let token;

  if (authorization !== undefined) {
    const match = authorization.trim().match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new ApiError(
        401,
        "Invalid Authorization header. Use Bearer followed by your access token"
      );
    }

    token = match[1];
  } else {
    token = req.cookies?.accessToken;
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new ApiError(
      401,
      "Access token missing. Please login and send your access token"
    );
  }

  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new ApiError(500, "Access token secret is not configured");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      token.trim(),
      process.env.ACCESS_TOKEN_SECRET
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired. Please login again");
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      throw new ApiError(401, "Invalid access token. Please login again");
    }

    throw error;
  }

  if (
    typeof decodedToken?._id !== "string" ||
    !mongoose.isValidObjectId(decodedToken._id)
  ) {
    throw new ApiError(401, "Invalid access token payload");
  }

  const user = await User.findById(decodedToken._id)
    .select("-password -refreshToken");

  if (!user) {
    throw new ApiError(401, "User no longer exists. Please login again");
  }

  req.user = user;
  next();
});