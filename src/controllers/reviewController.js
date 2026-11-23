const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Product = require('../models/Product');

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

    // Find product to link productGroupId
    let productGroupId = '';
    if (booking.productId) {
      const prod = await Product.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(booking.productId) ? booking.productId : new mongoose.Types.ObjectId() },
          { slug: booking.productId }
        ]
      });
      if (prod && prod.productGroupId) {
        productGroupId = prod.productGroupId;
      }
    }

    const review = await Review.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      productId: booking.productId || '',
      productGroupId,
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
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/reviews/admin-create
// Admin manually creates a review for any product/URL
// Protected + Admin
// ─────────────────────────────────────────────
const createReviewAdmin = async (req, res) => {
  try {
    const { productId, productName, customerName, city, rating, comment, status } = req.body;

    if (!productId || !customerName || !rating || !comment) {
      return res.status(400).json({
        message: 'Product, customer name, rating, and comment are required.',
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    // Look up product to resolve ID, name, and productGroupId
    const prod = await Product.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(productId) ? productId : new mongoose.Types.ObjectId() },
        { slug: productId }
      ]
    });

    let resolvedProductId = String(productId);
    let resolvedProductName = productName;
    let resolvedProductGroupId = '';

    if (prod) {
      resolvedProductId = String(prod._id);
      if (!resolvedProductName) {
        resolvedProductName = prod.name;
      }
      if (prod.productGroupId) {
        resolvedProductGroupId = prod.productGroupId;
      }
    } else if (!resolvedProductName) {
      resolvedProductName = 'Decoration Package';
    }

    const review = await Review.create({
      productId: resolvedProductId,
      productGroupId: resolvedProductGroupId,
      productName: resolvedProductName,
      customerName: customerName.trim(),
      city: city ? city.trim() : '',
      rating: numRating,
      comment: comment.trim(),
      status: status || 'APPROVED',
      isManual: true,
      booking: null,
      bookingId: '',
      user: null,
    });

    return res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('createReviewAdmin error:', err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews/product/:productId
// Public: returns APPROVED & FEATURED reviews for a product (or its productGroupId across cities)
// ─────────────────────────────────────────────
const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if productId belongs to a product that has a productGroupId
    const targetProduct = await Product.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(productId) ? productId : new mongoose.Types.ObjectId() },
        { slug: productId }
      ]
    });

    const query = {
      status: { $in: ['APPROVED', 'FEATURED'] }
    };

    if (targetProduct) {
      const matchConditions = [
        { productId: String(targetProduct._id) },
        { productId: productId }
      ];
      if (targetProduct.slug) {
        matchConditions.push({ productId: targetProduct.slug });
      }
      if (targetProduct.productGroupId) {
        matchConditions.push({ productGroupId: targetProduct.productGroupId });
        // Also find all sibling product IDs sharing the same productGroupId
        const siblingProducts = await Product.find({ productGroupId: targetProduct.productGroupId }, '_id').lean();
        siblingProducts.forEach((sp) => {
          matchConditions.push({ productId: String(sp._id) });
        });
      }
      query.$or = matchConditions;
    } else {
      query.$or = [
        { productId: productId },
        { productGroupId: productId }
      ];
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const avg =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return res.json({
      reviews,
      count: reviews.length,
      averageRating: avg,
    });
  } catch (err) {
    console.error('getReviewsByProduct error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews/check/:bookingId
// Protected: checks if logged-in user already reviewed this booking
// ─────────────────────────────────────────────
const checkReviewed = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const review = await Review.findOne({ booking: booking._id, user: req.user._id });
    return res.json({ reviewed: Boolean(review), review: review || null });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reviews  (Admin)
// Protected + Admin: returns all reviews with status filter
// ─────────────────────────────────────────────
const getAllReviewsAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['PENDING', 'APPROVED', 'FEATURED', 'REJECTED'].includes(status)) {
      filter.status = status;
    }

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
  createReviewAdmin,
  getReviewsByProduct,
  checkReviewed,
  getAllReviewsAdmin,
  updateReviewStatus,
  deleteReview,
};
