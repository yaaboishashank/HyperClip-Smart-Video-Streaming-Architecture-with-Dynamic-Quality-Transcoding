import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const variantSchema = new Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    bytes: Number,
  },
  { _id: false }
);

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: true,
    },

    videoPublicId: {
      type: String,
      required: true,
    },

    thumbnail: {
      type: String,
      required: true,
    },

    thumbnailPublicId: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    duration: {
      type: Number,
      required: true,
      min: 0,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Permanent counting record, independent of watch history.
    viewedBy: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
      select: false,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    processingStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      default: "ready",
    },

    processingStage: {
      type: String,
      default: "",
    },

    processingError: {
      type: String,
      default: "",
    },

    processingAttempts: {
      type: Number,
      default: 0,
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    processingToken: {
      type: String,
      default: null,
      select: false,
    },

    leaseUntil: {
      type: Date,
      default: null,
      select: false,
    },

    processingAssets: {
      type: [String],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

videoSchema.index({ isPublished: 1, createdAt: -1 });
videoSchema.index({ processingStatus: 1, createdAt: 1 });

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);