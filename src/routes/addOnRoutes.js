const express = require('express');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const AddOn = require('../models/AddOn');

const router = express.Router();

// Public: Get all active add-ons (or by category)
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }
    if (req.query.activeOnly !== 'false') {
      query.isActive = true;
    }
    const addOns = await AddOn.find(query).sort({ popular: -1, createdAt: -1 });
    res.json(addOns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get all add-ons (including inactive)
router.get('/admin-all', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const addOns = await AddOn.find().sort({ createdAt: -1 });
    res.json(addOns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Create new add-on
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const newAddOn = new AddOn(req.body);
    const saved = await newAddOn.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin: Update add-on
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const updated = await AddOn.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Add-on not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin: Delete add-on
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const deleted = await AddOn.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Add-on not found' });
    res.json({ message: 'Add-on removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
