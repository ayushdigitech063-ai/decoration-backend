const express = require('express');
const router = express.Router();
const City = require('../models/City');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

const DEFAULT_CITIES = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Ahmedabad",
  "Faridabad",
  "Ghaziabad",
  "Gurugram",
  "Jaipur",
  "Kolkata",
  "Lucknow",
  "Mangalore",
  "Mysore",
  "Noida",
  "Pune",
  "Thane",
];

// Helper: Seed default cities if database has none
const seedDefaultCitiesIfNeeded = async () => {
  const count = await City.countDocuments();
  if (count === 0) {
    const docs = DEFAULT_CITIES.map((name, index) => ({
      name,
      isActive: true,
      isPopular: index < 6,
      order: index,
    }));
    await City.insertMany(docs);
  }
};

// GET /api/cities - Public endpoint (returns active cities sorted by order, or all if query ?all=true for admin)
router.get('/', async (req, res) => {
  try {
    await seedDefaultCitiesIfNeeded();
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const cities = await City.find(filter).sort({ order: 1, name: 1 });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cities - Super Admin / Admin creates a new city
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, state, icon, isActive, isPopular, order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'City name is required' });
    }

    const trimmedName = name.trim();
    const existing = await City.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ message: `City "${trimmedName}" already exists` });
    }

    const newCity = new City({
      name: trimmedName,
      state: state ? state.trim() : '',
      icon: icon || '',
      isActive: isActive !== undefined ? isActive : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      order: order !== undefined ? Number(order) : 0,
    });

    const saved = await newCity.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/cities/:id - Super Admin / Admin updates city details
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, state, icon, isActive, isPopular, order } = req.body;
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await City.findOne({
        _id: { $ne: city._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({ message: `City "${trimmedName}" already exists` });
      }
      city.name = trimmedName;
    }

    if (state !== undefined) city.state = state.trim();
    if (icon !== undefined) city.icon = icon;
    if (isActive !== undefined) city.isActive = Boolean(isActive);
    if (isPopular !== undefined) city.isPopular = Boolean(isPopular);
    if (order !== undefined) city.order = Number(order);

    const updated = await city.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/cities/:id - Super Admin / Admin deletes a city
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
