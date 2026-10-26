const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

// Seed default staff members if empty
const seedDefaultStaff = async () => {
  const count = await Staff.countDocuments();
  if (count === 0) {
    const defaults = [
      {
        name: 'Ramesh Kumar',
        role: 'Lead Decorator',
        phone: '+91-9810123456',
        city: 'Delhi',
        serviceAreas: ['South Delhi', 'Connaught Place', 'Saket'],
        rating: 4.9,
        isActive: true,
      },
      {
        name: 'Sunil Verma',
        role: 'Balloon Artist',
        phone: '+91-9820234567',
        city: 'Mumbai',
        serviceAreas: ['Bandra', 'Andheri', 'Juhu'],
        rating: 4.8,
        isActive: true,
      },
      {
        name: 'Amit Sharma',
        role: 'Event Manager',
        phone: '+91-9830345678',
        city: 'Bangalore',
        serviceAreas: ['Koramangala', 'Indiranagar', 'Whitefield'],
        rating: 4.9,
        isActive: true,
      },
      {
        name: 'Vikram Singh',
        role: 'Lead Decorator',
        phone: '+91-9840456789',
        city: 'Jaipur',
        serviceAreas: ['Malviya Nagar', 'Vaishali Nagar', 'C-Scheme'],
        rating: 4.7,
        isActive: true,
      },
    ];
    await Staff.insertMany(defaults);
  }
};
seedDefaultStaff().catch(() => {});

// GET /api/staff - List all staff
router.get('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/staff - Create staff member
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, role, phone, email, city, serviceAreas, isActive } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and Phone number are required' });
    }

    const newStaff = new Staff({
      name: name.trim(),
      role: role || 'Lead Decorator',
      phone: phone.trim(),
      email: email ? email.trim() : '',
      city: city || 'Delhi',
      serviceAreas: Array.isArray(serviceAreas)
        ? serviceAreas
        : typeof serviceAreas === 'string'
        ? serviceAreas.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const saved = await newStaff.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/staff/:id - Update staff member
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, role, phone, email, city, serviceAreas, isActive } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });

    if (name !== undefined) staff.name = name.trim();
    if (role !== undefined) staff.role = role;
    if (phone !== undefined) staff.phone = phone.trim();
    if (email !== undefined) staff.email = email.trim();
    if (city !== undefined) staff.city = city.trim();
    if (isActive !== undefined) staff.isActive = Boolean(isActive);
    if (serviceAreas !== undefined) {
      staff.serviceAreas = Array.isArray(serviceAreas)
        ? serviceAreas
        : typeof serviceAreas === 'string'
        ? serviceAreas.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    const saved = await staff.save();
    res.json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/staff/:id - Delete staff member
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    await staff.deleteOne();
    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
