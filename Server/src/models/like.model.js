import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

likeSchema.pre("validate", function () {
  const targets = [this.video, this.comment, this.tweet].filter(Boolean);

  if (targets.length !== 1) {
    this.invalidate("video", "A like must belong to exactly one item");
  }
});

for (const field of ["video", "comment", "tweet"]) {
  likeSchema.index(
    { [field]: 1, likedBy: 1 },
    {
      unique: true,
      partialFilterExpression: {
        [field]: { $type: "objectId" },
      },
    }
  );
}

likeSchema.index({ likedBy: 1, createdAt: -1 });

export const Like = mongoose.model("Like", likeSchema);