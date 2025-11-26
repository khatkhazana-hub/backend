const Product = require("../models/Product");

const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

exports.listProducts = async (req, res) => {
  try {
    const { category, active = "true" } = req.query;
    const query = {};
    if (category) query.category = category;
    if (active === "true") query.active = true;

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("listProducts error:", err);
    res.status(500).json({ message: "Unable to fetch products" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product =
      (await Product.findById(id)) ||
      (await Product.findOne({ slug: id }));

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("getProduct error:", err);
    res.status(500).json({ message: "Unable to fetch product" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, category, tag, rating, reviews, inStock, image, featured, active } =
      req.body;
    if (!title || !description || price == null || !category || !image) {
      return res.status(400).json({ message: "title, description, price, category, image are required" });
    }
    const slug = slugify(title);
    const existing = await Product.findOne({ slug });
    if (existing) return res.status(400).json({ message: "Product with this title already exists" });

    const product = await Product.create({
      title,
      description,
      price,
      category,
      tag,
      rating,
      reviews,
      inStock,
      image,
      featured,
      active,
      slug,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ message: "Unable to create product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.title) {
      updates.slug = slugify(updates.title);
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Unable to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ message: "Unable to delete product" });
  }
};
