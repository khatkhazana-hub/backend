// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    active: { type: Boolean, default: true },
    // NEW: persistent order (lower = earlier)
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
