// models/Contact.js
const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 },
    zip: { type: String, trim: true, maxlength: 20 },
    message: { type: String, trim: true, maxlength: 5000 },
    subscribe: { type: Boolean, default: false },
   
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", ContactSchema);
