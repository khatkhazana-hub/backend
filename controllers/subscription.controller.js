const axios = require("axios");
const Subscription = require("../models/Subscription");

exports.createSubscription = async (req, res) => {
  try {
    const captchaToken =
      req.body["cf-turnstile-response"] || req.body.captchaToken || "";
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha token missing." });
    }

    const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
    if (!secretKey) {
      console.error("createSubscription error: missing CLOUDFLARE_SECRET_KEY");
      return res
        .status(500)
        .json({ message: "Captcha configuration missing on server." });
    }

    try {
      const verifyURL =
        "https://challenges.cloudflare.com/turnstile/v0/siteverify";
      const { data } = await axios.post(
        verifyURL,
        new URLSearchParams({
          secret: secretKey,
          response: captchaToken,
          remoteip: req.ip,
        })
      );

      if (!data.success) {
        console.error("Subscription Turnstile failed:", data["error-codes"]);
        return res
          .status(400)
          .json({ message: "Captcha verification failed, please retry." });
      }
    } catch (captchaErr) {
      console.error("Subscription Turnstile error:", captchaErr.message);
      return res
        .status(502)
        .json({ message: "Captcha verification error. Please try again." });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(200).json({
        message: "You are already subscribed.",
        data: existing,
      });
    }

    const doc = await Subscription.create({
      email,
    });

    return res.status(201).json({
      message: "Subscription saved.",
      data: doc,
    });
  } catch (err) {
    console.error("createSubscription error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const q = String(req.query.q || "").trim();

    const filter = q ? { email: { $regex: q, $options: "i" } } : {};

    const [items, total] = await Promise.all([
      Subscription.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getSubscriptions error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const deleted = await Subscription.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Subscription not found." });
    }
    return res.json({ message: "Subscription deleted." });
  } catch (err) {
    console.error("deleteSubscription error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
