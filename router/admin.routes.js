// routes/admin.routes.js
const express = require("express");
const router = express.Router();
const { registerAdmin, loginAdmin, getMe } = require("../controllers/admin.controller");
const auth = require("../middleware/auth");

// POST /admin/register
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", auth, getMe);

module.exports = router;
