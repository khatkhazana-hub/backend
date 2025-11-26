const express = require("express");
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");
const requireAuth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.get("/products", listProducts);
router.get("/products/:id", getProduct);

router.post("/products", requireAuth, createProduct);
router.put("/products/:id", requireAuth, updateProduct);
router.delete("/products/:id", requireAuth, deleteProduct);
router.post("/products/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const filename = req.file.filename;
  const url = `${req.protocol}://${req.get("host")}/uploads/products/${filename}`;
  res.json({ url, filename });
});

module.exports = router;
