import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

subscriptionSchema.pre("validate", function () {
  if (
    this.subscriber &&
    this.channel &&
    this.subscriber.equals(this.channel)
  ) {
    this.invalidate("channel", "You cannot subscribe to yourself");
  }
});

subscriptionSchema.index(
  { subscriber: 1, channel: 1 },
  { unique: true }
);

subscriptionSchema.index({ channel: 1, createdAt: -1 });

export const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);