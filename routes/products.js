const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

//Seach filter for name and description
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q
    if(!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" })
    }

    const products = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: "Error occured while searching" })
  }
})

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
});
// GET products by category
router.get("/category/:category", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products by category" });
  }
});

// GET single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

// POST new product
router.post("/", async (req, res) => {
  try {
    const { name, price, description, category} = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: "Error creating product" });
  }
});

// PUT update product
router.put("/:id", async (req, res) => {
  try {
    const { category, ...updateFields } = req.body;

    // If category is provided, ensure it's not empty
    if (category !== undefined && category.trim() === "") {
      return res.status(400).json({ error: "Category cannot be empty" });
    }

    if (category) updateFields.category = category;

    const product = await Product.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error updating product" });
  }
});

// DELETE product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

// DELETE all products
router.delete("/", async (req, res) => {
  try {
    await Product.deleteMany();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting all products", error);
    res.status(500).json({ error: "Error deleting all products" });
  }
});



module.exports = router;
