const express = require('express');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Package = require('../models/Package');

const router = express.Router();

// GET all packages or filter by pageTarget
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.pageTarget) {
      query.pageTarget = req.query.pageTarget;
    }
    const packages = await Package.find(query).sort({ createdAt: -1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE package
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE package
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const updatedPackage = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPackage) return res.status(404).json({ message: 'Package not found' });
    res.json(updatedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE package
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const deletedPackage = await Package.findByIdAndDelete(req.params.id);
    if (!deletedPackage) return res.status(404).json({ message: 'Package not found' });
    res.json({ message: 'Package removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
