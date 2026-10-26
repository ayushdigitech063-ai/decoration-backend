const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // The booking this review is linked to (optional for admin-created reviews)
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    bookingId: {
      type: String,
      default: '',
    },

    // The product/decoration being reviewed
    productId: {
      type: String,
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },

    // The customer who submitted (optional for admin-created reviews)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerName: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      default: '',
    },

    // Review content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Admin moderation
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'FEATURED', 'REJECTED'],
      default: 'PENDING',
    },
    isManual: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Sparse compound index for customer reviews
reviewSchema.index({ booking: 1, user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
