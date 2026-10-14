const express = require('express');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const Gallery = require('../models/Gallery');

const router = express.Router();

// GET public gallery items (optionally filtered by pageTarget)
router.get('/', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.pageTarget && req.query.pageTarget !== 'all') {
      query.pageTarget = req.query.pageTarget;
    }
    const items = await Gallery.find(query).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET admin gallery items (includes inactive items)
router.get('/admin', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const query = {};
    if (req.query.pageTarget && req.query.pageTarget !== 'all') {
      query.pageTarget = req.query.pageTarget;
    }
    const items = await Gallery.find(query).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE gallery item
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { title, image, pageTarget, category, order, isActive } = req.body;
    if (!title || !image) {
      return res.status(400).json({ message: 'Title and image are required' });
    }

    const newItem = new Gallery({
      title,
      image,
      pageTarget: pageTarget || 'wall-decoration',
      category: category || 'Showcase',
      order: Number(order) || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE gallery item
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const updated = await Gallery.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Gallery item not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE gallery item
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const deleted = await Gallery.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Gallery item not found' });
    res.json({ message: 'Gallery item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
