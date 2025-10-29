const express = require("express");
const {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require("../controllers/categoryController");

const router = express.Router();

// admin creates category
router.post("/categories",  createCategory);

// anyone (frontend dropdown) fetches categories
router.get("/categories", listCategories);

// admin reorders categories
router.put("/categories/reorder", reorderCategories);

// admin updates / toggles active / renames
router.put("/categories/:id", updateCategory);

// admin deletes
router.delete("/categories/:id", deleteCategory);

module.exports = router;
