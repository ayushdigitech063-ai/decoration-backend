const express = require('express');
const router = express.Router();
const {
  submitReview,
  getReviewsByProduct,
  checkReviewed,
  getAllReviewsAdmin,
  updateReviewStatus,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

// Public: get approved reviews for a product
router.get('/product/:productId', getReviewsByProduct);

// Protected customer routes
router.post('/', protect, submitReview);
router.get('/check/:bookingId', protect, checkReviewed);

// Admin-only routes
router.get('/', protect, adminOrSuperAdmin, getAllReviewsAdmin);
router.put('/:id', protect, adminOrSuperAdmin, updateReviewStatus);
router.delete('/:id', protect, adminOrSuperAdmin, deleteReview);

module.exports = router;
