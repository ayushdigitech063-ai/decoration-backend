const Review = require('../models/Review');
const Booking = require('../models/Booking');

// ─────────────────────────────────────────────
// POST /api/reviews
// Customer submits a review for a COMPLETED booking
// Protected: must be logged in
// ─────────────────────────────────────────────
const submitReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ message: 'bookingId, rating and comment are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    // Find the booking
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Must belong to the logged-in user
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only review your own bookings.' });
    }

    // Booking must be COMPLETED
    if (booking.bookingStatus !== 'COMPLETED') {
      return res.status(400).json({
        message: 'Reviews can only be submitted for completed events.',
      });
    }

    // Check duplicate
    const existing = await Review.findOne({ booking: booking._id, user: req.user._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this booking.' });
    }

    const review = await Review.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      productId: booking.productId || '',
      productName: booking.productName,
      user: req.user._id,
      customerName: req.user.name || booking.customerName,
      city: booking.city || '',
      rating: Number(rating),
      comment: comment.trim(),
    });

    return res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this booking.' });
    }
    console.error('submitReview error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews/product/:productId
// Public: fetch APPROVED + FEATURED reviews for a product
// ─────────────────────────────────────────────
const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({
      productId,
      status: { $in: ['APPROVED', 'FEATURED'] },
    })
      .sort({ status: -1, createdAt: -1 }) // FEATURED first
      .limit(20)
      .lean();

    // Compute average
    const avg =
      reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return res.json({ reviews, averageRating: avg, totalCount: reviews.length });
  } catch (err) {
    console.error('getReviewsByProduct error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews/check/:bookingId
// Protected: check if current user already reviewed this booking
// ─────────────────────────────────────────────
const checkReviewed = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId });
    if (!booking) return res.json({ reviewed: false });

    const existing = await Review.findOne({ booking: booking._id, user: req.user._id });
    return res.json({ reviewed: !!existing, review: existing || null });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews  (Admin)
// Protected + Admin: get all reviews with optional status filter
// ─────────────────────────────────────────────
const getAllReviewsAdmin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const reviews = await Review.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      total: await Review.countDocuments(),
      pending: await Review.countDocuments({ status: 'PENDING' }),
      approved: await Review.countDocuments({ status: 'APPROVED' }),
      featured: await Review.countDocuments({ status: 'FEATURED' }),
      rejected: await Review.countDocuments({ status: 'REJECTED' }),
    };

    return res.json({ reviews, stats });
  } catch (err) {
    console.error('getAllReviewsAdmin error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/reviews/:id  (Admin)
// Protected + Admin: update review status
// ─────────────────────────────────────────────
const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'APPROVED', 'FEATURED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    return res.json({ success: true, review });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/reviews/:id  (Admin)
// ─────────────────────────────────────────────
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  submitReview,
  getReviewsByProduct,
  checkReviewed,
  getAllReviewsAdmin,
  updateReviewStatus,
  deleteReview,
};
