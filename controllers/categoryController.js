const Category = require("../models/Category");

// util to create slugs like "War Political" -> "war-political"
function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });

    const slug = slugify(name);
    const exists = await Category.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (exists) return res.status(409).json({ error: "Category already exists." });

    const cat = await Category.create({ name: name.trim(), slug });
    res.status(201).json(cat);
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({ error: "Server error creating category." });
  }
};

exports.listCategories = async (req, res) => {
  try {
    const cats = await Category.find({ active: true }).sort({ name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching categories." });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const update = {};
    if (typeof name === "string" && name.trim()) {
      update.name = name.trim();
      update.slug = slugify(name);
    }
    if (typeof active === "boolean") update.active = active;

    const cat = await Category.findByIdAndUpdate(id, update, { new: true });
    if (!cat) return res.status(404).json({ error: "Category not found." });

    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: "Server error updating category." });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) return res.status(404).json({ error: "Category not found." });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error deleting category." });
  }
};
