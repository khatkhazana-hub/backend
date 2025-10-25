const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("Subscription", SubscriptionSchema);
