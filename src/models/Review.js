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
    productGroupId: {
      type: String,
      default: '',
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
    },

    // Review status for moderation
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'FEATURED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },

    // Flag if created by admin or verified customer
    isManual: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ productGroupId: 1, status: 1 });

module.exports = mongoose.model('Review', reviewSchema);
