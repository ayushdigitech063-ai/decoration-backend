const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

// GET /api/coupons - Admin: Get all coupons
router.get('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/coupons/active - Public / User: Get public active coupons
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    }).select('-timesUsed');
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/coupons/validate - Customer applies a coupon
router.post('/validate', async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: 'This coupon is no longer active' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return res.status(400).json({ message: 'This coupon usage limit has been reached' });
    }

    const amount = Number(orderAmount) || 0;
    if (coupon.minOrderValue && amount < coupon.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order value of ₹${coupon.minOrderValue} required to use this coupon`,
      });
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (amount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order amount
    discount = Math.min(discount, amount);

    res.json({
      valid: true,
      code: coupon.code,
      discountAmount: Math.round(discount),
      finalAmount: Math.max(0, Math.round(amount - discount)),
      coupon,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/coupons - Admin creates a coupon
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
      isActive,
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const formattedCode = code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: formattedCode });
    if (existing) {
      return res.status(400).json({ message: `Coupon "${formattedCode}" already exists` });
    }

    const newCoupon = new Coupon({
      code: formattedCode,
      description: description ? description.trim() : '',
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue) || 0,
      minOrderValue: minOrderValue !== undefined && minOrderValue !== '' ? Number(minOrderValue) : 0,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const saved = await newCoupon.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/coupons/:id - Admin updates a coupon
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
      isActive,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (code && code.trim()) {
      const formattedCode = code.toUpperCase().trim();
      const existing = await Coupon.findOne({
        _id: { $ne: coupon._id },
        code: formattedCode,
      });
      if (existing) {
        return res.status(400).json({ message: `Coupon "${formattedCode}" already exists` });
      }
      coupon.code = formattedCode;
    }

    if (description !== undefined) coupon.description = description.trim();
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (minOrderValue !== undefined) coupon.minOrderValue = minOrderValue === '' ? 0 : Number(minOrderValue);
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    const saved = await coupon.save();
    res.json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/coupons/:id - Admin deletes a coupon
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
