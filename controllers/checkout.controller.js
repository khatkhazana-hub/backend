const Stripe = require("stripe");
const Order = require("../models/Order");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? Stripe(stripeSecret) : null;

const priceMap = {
  "letter-kit": { title: "Scripted Letters Kit", price: 24, category: "Stationery" },
  "wax-stamp": { title: "Brass Wax Seal Set", price: 18.5, category: "Keepsakes" },
  folio: { title: "Travel Letter Folio", price: 32, category: "Keepsakes" },
  "poetry-postcards": { title: "Poetry Postcards (Set of 12)", price: 14, category: "Stationery" },
  "photo-prints": { title: "Archival Photo Prints", price: 27, category: "Art Prints" },
  "ink-set": { title: "Midnight Ink + Glass Pen", price: 21, category: "Stationery" },
  "brass-bookmark": { title: "Brass Bookmark Pair", price: 12, category: "Accessories" },
  "pressed-florals": { title: "Pressed Floral Prints", price: 16, category: "Art Prints" },
};

const calcShipping = (subtotal) => {
  if (subtotal <= 0) return 0;
  return subtotal >= 95 ? 0 : 6.5;
};

const calcTax = (subtotal) => {
  if (subtotal <= 0) return 0;
  return parseFloat((subtotal * 0.07).toFixed(2));
};

const normalizeItems = (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error("Cart items are required.");
    err.status = 400;
    throw err;
  }

  let subtotal = 0;
  const normalized = items.map(({ id, quantity }) => {
    const product = priceMap[id];
    if (!product) {
      const err = new Error(`Unknown product id: ${id}`);
      err.status = 400;
      throw err;
    }
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      const err = new Error("Quantity must be at least 1.");
      err.status = 400;
      throw err;
    }
    subtotal += product.price * qty;
    return {
      productId: id,
      title: product.title,
      category: product.category,
      price: product.price,
      quantity: qty,
    };
  });

  subtotal = parseFloat(subtotal.toFixed(2));
  const shipping = calcShipping(subtotal);
  const tax = calcTax(subtotal);
  const total = parseFloat((subtotal + shipping + tax).toFixed(2));

  return { normalized, subtotal, shipping, tax, total };
};

exports.createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY." });
    }

    const { items = [], customer = {} } = req.body || {};
    const { normalized, subtotal, shipping, tax, total } = normalizeItems(items);
    const amountInCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: "Khat Khazana order",
      receipt_email: customer.email || undefined,
      metadata: {
        customerName: customer.name || "",
        customerEmail: customer.email || "",
        note: customer.note || "",
        subtotal: subtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
      },
    });

    const order = await Order.create({
      items: normalized,
      subtotal,
      shipping,
      tax,
      total,
      currency: "usd",
      customer,
      stripePaymentIntentId: paymentIntent.id,
      stripeStatus: paymentIntent.status,
      receiptEmail: paymentIntent.receipt_email,
      status: paymentIntent.status || "requires_payment",
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: order._id,
      amount: total,
      currency: "usd",
    });
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Unable to create payment intent." });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY." });
    }

    const { paymentIntentId, orderId } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required." });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const order = await Order.findOne(
      orderId
        ? { _id: orderId, stripePaymentIntentId: paymentIntentId }
        : { stripePaymentIntentId: paymentIntentId }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found for this payment intent." });
    }

    order.stripeStatus = paymentIntent.status;
    order.status = paymentIntent.status;
    order.stripeChargeId = paymentIntent.latest_charge;
    if (paymentIntent.status === "succeeded") {
      order.paidAt = new Date();
    }
    await order.save();

    return res.json({ order, paymentIntent });
  } catch (error) {
    console.error("confirmPayment error:", error);
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Unable to confirm payment." });
  }
};
