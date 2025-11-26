const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    customer: {
      name: { type: String },
      email: { type: String },
      note: { type: String },
    },
    stripePaymentIntentId: { type: String, index: true },
    stripeStatus: { type: String },
    stripeChargeId: { type: String },
    receiptEmail: { type: String },
    paidAt: { type: Date },
    status: {
      type: String,
      default: "requires_payment_method",
      enum: [
        "requires_payment_method",
        "requires_payment",
        "requires_confirmation",
        "processing",
        "requires_action",
        "requires_capture",
        "succeeded",
        "canceled",
      ],
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
