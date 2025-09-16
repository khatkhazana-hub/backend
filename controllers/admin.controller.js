// controllers/admin.controller.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

exports.registerAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Admin with this email already exists." });
    }

    const admin = await Admin.create({ name, email, password });

    return res.status(201).json({
      message: "Admin registered successfully.",
      data: admin, // password removed by toJSON()
    });
  } catch (err) {
    console.error("registerAdmin error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// ===== NEW: LOGIN =====
exports.loginAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const ok = await admin.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    const payload = { sub: admin._id.toString(), role: admin.role,};
    const token = jwt.sign(payload, process.env.JWT_SECRET || "dev_secret_change_me", {
      expiresIn: "7d",
    });


    return res.json({
      message: "Login successful.",
      token,          
      // admin: admin,   
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


// ===== NEW: GET /admin/me (requires auth middleware) =====
exports.getMe = async (req, res) => {
  try {
    // req.user.sub set by auth middleware
    const admin = await Admin.findById(req.user.sub);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ admin }); // password already stripped by toJSON()
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
