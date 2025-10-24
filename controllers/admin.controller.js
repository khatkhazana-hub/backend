// controllers/admin.controller.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
const Admin = require("../models/Admin");
// optional: plug your real mailer here
const { sendMail } = require("../utils/mailer");
const resetEmailTemplate = require("../utils/resetEmail");

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

exports.registerAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res
        .status(409)
        .json({ message: "Admin with this email already exists." });
    }

    const admin = await Admin.create({ name, email, password });
    return res.status(201).json({
      message: "Admin registered successfully.",
      data: admin,
    });
  } catch (err) {
    console.error("registerAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    // --- Turnstile verification ---
    const captchaToken =
      req.body["cf-turnstile-response"] || req.body.captchaToken || "";
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha token missing." });
    }

    const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
    if (!secretKey) {
      console.error("loginAdmin error: CLOUDFLARE_SECRET_KEY missing");
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
        console.error("Turnstile verification failed:", data["error-codes"]);
        return res
          .status(400)
          .json({ message: "Captcha verification failed." });
      }
    } catch (captchaErr) {
      console.error("Turnstile verification error:", captchaErr.message);
      return res
        .status(502)
        .json({ message: "Captcha verification error. Please retry." });
    }
    // --- end verification ---

    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const ok = await admin.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const payload = { sub: admin._id.toString(), role: admin.role };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "dev_secret_change_me",
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful.",
      token,
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.sub);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ admin });
  } catch (err) {
    console.error("getMe error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

/**
 * NEW: Request password reset
 * Body: { email }
 * - Always respond generically to avoid user enumeration.
 * - Sends a reset link with ?token=...&email=...
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      // explicitly tell user this email is not in DB
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    }

    // generate raw token and hash for storage
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    admin.resetPasswordToken = hashed;
    admin.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await admin.save();

    const clientBase = process.env.CLIENT_URL;
    const resetUrl = `${clientBase}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      email
    )}`;

    try {
      await sendMail({
        to: email,
        subject: "Reset your password",
        html: resetEmailTemplate({
          appName: "KhatKhazana",
          resetUrl, // e.g. http://localhost:5173/reset-password?token=...&email=...
          expiresMins: 15,
          supportEmail: "support@khatkhazana.com",
          logoUrl: "https://your-cdn/logo.png", // ✅ replace with your logo
        }),
      });
    } catch (mailErr) {
      // if mail fails, clear the token to avoid dead state
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save();
      console.error("requestPasswordReset mail error:", mailErr);
      return res.status(500).json({ message: "Failed to send reset email." });
    }

    return res.json({ message: "Reset email has been sent." });
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

/**
 * NEW: Reset password
 * Body: { email, token, newPassword }
 */
exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "");
    const newPassword = String(req.body.newPassword || "");

    if (!email || !token || !newPassword) {
      return res
        .status(400)
        .json({ message: "email, token and newPassword are required." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      email,
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!admin) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    admin.password = newPassword; // will hash in pre-save hook
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    return res.json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
