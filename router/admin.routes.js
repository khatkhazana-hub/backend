// routes/admin.routes.js
const express = require("express");
const router = express.Router();
const { registerAdmin, loginAdmin, getMe, requestPasswordReset, resetPassword } = require("../controllers/admin.controller");
const auth = require("../middleware/auth");

// POST /admin/register
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", auth, getMe);


router.post("/password/forgot", requestPasswordReset);
router.post("/password/reset", resetPassword);

module.exports = router;
