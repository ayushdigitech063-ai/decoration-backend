const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

// @desc    Create a new booking (Logged in customer only)
// @route   POST /api/bookings
// @access  Private (User/Customer)
router.post('/', protect, async (req, res) => {
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
    } = req.body;

    if (!productName || !eventDate || !totalAmount) {
      return res.status(400).json({ message: 'Missing required booking fields (Product, Date, Amount)' });
    }

    const calculatedAdvance = advanceAmountPaid || Math.round(Number(totalAmount) * 0.5);
    const calculatedPending = onSiteAmountPending !== undefined ? onSiteAmountPending : (Number(totalAmount) - calculatedAdvance);

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const bookingId = `BK-${Date.now().toString().slice(-4)}-${randomSuffix}`;
    const transactionId = `TXN_${Date.now().toString().slice(-6)}_${Math.floor(1000 + Math.random() * 9000)}`;

    const booking = await Booking.create({
      bookingId,
      user: req.user._id,
      customerName: customerName || req.user.name,
      customerEmail: req.user.email,
      customerPhone: customerPhone || req.user.phone || '',
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
      message: 'Booking created successfully with 50% advance confirmed!',
      booking,
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
