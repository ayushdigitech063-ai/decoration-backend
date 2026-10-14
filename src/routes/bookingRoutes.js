const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

// Helper: Optional protect (if bearer token is present, populates req.user)
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superadmin_secret_key_partysquare_2026');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (e) {
      // Proceed without user
    }
  }
  next();
};

// @desc    Create a new booking (Logged in or Direct Customer)
// @route   POST /api/bookings
// @access  Public / Private
router.post('/', optionalProtect, async (req, res) => {
  try {
    const {
      productName,
      productId,
      productImage,
      city,
      eventDate,
      eventTimeSlot,
      deliveryAddress,
      specialRequests,
      totalAmount,
      advanceAmountPaid,
      onSiteAmountPending,
      paymentMethod,
      customerPhone,
      customerName,
      customerEmail,
    } = req.body;

    if (!productName || !eventDate || !totalAmount) {
      return res.status(400).json({ message: 'Missing required booking fields (Product, Date, Amount)' });
    }

    let userDoc = req.user;
    let token = null;

    if (!userDoc) {
      const cleanPhone = (customerPhone || '').trim().replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone) {
        userDoc = await User.findOne({ phone: cleanPhone });
        if (!userDoc) {
          userDoc = await User.create({
            name: customerName || 'Customer',
            phone: cleanPhone,
            email: customerEmail || `cust_${cleanPhone}@partysquare.in`,
            role: 'user',
            authProvider: 'phone_otp',
          });
        }
      } else {
        userDoc = await User.findOne({ email: customerEmail || 'guest@partysquare.in' });
        if (!userDoc) {
          userDoc = await User.create({
            name: customerName || 'Guest User',
            email: customerEmail || 'guest@partysquare.in',
            role: 'user',
          });
        }
      }
      token = generateToken(userDoc);
    }

    const calculatedAdvance = advanceAmountPaid || Math.round(Number(totalAmount) * 0.5);
    const calculatedPending = onSiteAmountPending !== undefined ? onSiteAmountPending : (Number(totalAmount) - calculatedAdvance);

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const bookingId = `BK-${Date.now().toString().slice(-4)}-${randomSuffix}`;
    const transactionId = `TXN_${Date.now().toString().slice(-6)}_${Math.floor(1000 + Math.random() * 9000)}`;

    const booking = await Booking.create({
      bookingId,
      user: userDoc._id,
      customerName: customerName || userDoc.name,
      customerEmail: customerEmail || userDoc.email || 'customer@partysquare.in',
      customerPhone: customerPhone || userDoc.phone || '',
      productName,
      productId: productId || '',
      productImage: productImage || '',
      city: city || 'Delhi',
      eventDate,
      eventTimeSlot: eventTimeSlot || 'Evening (04:00 PM - 08:00 PM)',
      deliveryAddress: deliveryAddress || '',
      specialRequests: specialRequests || '',
      totalAmount: Number(totalAmount),
      advanceAmountPaid: calculatedAdvance,
      onSiteAmountPending: calculatedPending,
      paymentMethod: paymentMethod || 'upi',
      transactionId,
      paymentStatus: '50%_ADVANCE_PAID',
      bookingStatus: 'CONFIRMED',
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully with confirmed status!',
      booking,
      token,
      user: {
        _id: userDoc._id,
        name: userDoc.name,
        phone: userDoc.phone,
        email: userDoc.email,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Failed to create booking', error: error.message });
  }
});

// @desc    Get current user's bookings
// @route   GET /api/bookings/my
// @access  Private (User)
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error loading user bookings', error: error.message });
  }
});

// @desc    Get bookings by phone number
// @route   GET /api/bookings/by-phone/:phone
router.get('/by-phone/:phone', async (req, res) => {
  try {
    const cleanPhone = req.params.phone.trim().replace(/[^0-9]/g, '').slice(-10);
    const bookings = await Booking.find({
      $or: [
        { customerPhone: cleanPhone },
        { customerPhone: `+91${cleanPhone}` },
        { customerPhone: new RegExp(cleanPhone, 'i') }
      ]
    }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bookings by phone', error: error.message });
  }
});

// @desc    Get all bookings (Admin & Super Admin)
// @route   GET /api/bookings
// @access  Private/Admin
router.get('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bookings', error: error.message });
  }
});

// @desc    Update booking status or payment status
// @route   PUT /api/bookings/:id
// @access  Private/Admin
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const { bookingStatus, paymentStatus, onSiteAmountPending } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
      if (paymentStatus === 'FULLY_PAID') {
        booking.onSiteAmountPending = 0;
      }
    }
    if (onSiteAmountPending !== undefined) {
      booking.onSiteAmountPending = onSiteAmountPending;
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking', error: error.message });
  }
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await booking.deleteOne();
    res.json({ message: 'Booking removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting booking', error: error.message });
  }
});

module.exports = router;
