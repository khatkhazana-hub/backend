const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    tag: { type: String },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    image: { type: String, required: true },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
