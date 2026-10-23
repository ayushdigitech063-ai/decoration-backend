const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // The booking this review is linked to (must be COMPLETED)
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
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

    // The customer who submitted
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// One review per booking per user
reviewSchema.index({ booking: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
