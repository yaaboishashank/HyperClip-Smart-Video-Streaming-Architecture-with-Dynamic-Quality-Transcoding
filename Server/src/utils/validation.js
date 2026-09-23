import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export const checkId = (id) => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid ID");
  }
};

export const readText = (value, name, maxLength) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new ApiError(
      400,
      `${name} must contain 1 to ${maxLength} characters`
    );
  }

  return value.trim();
};

export const readPagination = (query) => {
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

export const getOwnedDocument = async (
  Model,
  id,
  userId,
  label
) => {
  checkId(id);

  const document = await Model.findById(id);

  if (!document) {
    throw new ApiError(404, `${label} not found`);
  }

  if (String(document.owner) !== String(userId)) {
    throw new ApiError(403, `You can only modify your own ${label}`);
  }

  return document;
};