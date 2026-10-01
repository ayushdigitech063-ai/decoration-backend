const express = require('express');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Category = require('../models/Category');

const router = express.Router();

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().populate('parentCategory');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE category
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const category = new Category(req.body);
    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE category
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE category
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
