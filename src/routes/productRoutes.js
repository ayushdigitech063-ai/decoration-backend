const express = require('express');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Product = require('../models/Product');

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.category) {
      if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = req.query.category;
      } else {
        const Category = require('../models/Category');
        const cat = await Category.findOne({ slug: req.query.category });
        if (cat) query.category = cat._id;
      }
    }
    if (req.query.subcategory) {
      if (req.query.subcategory.match(/^[0-9a-fA-F]{24}$/)) {
        query.subcategory = req.query.subcategory;
      } else {
        const Category = require('../models/Category');
        const subcat = await Category.findOne({ slug: req.query.subcategory });
        if (subcat) query.subcategory = subcat._id;
      }
    }
    
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE product
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE product
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE product
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
