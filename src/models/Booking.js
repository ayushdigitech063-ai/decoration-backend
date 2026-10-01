const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    // Product or Decoration package details
    productName: {
      type: String,
      required: true,
    },
    productId: {
      type: String,
      default: '',
    },
    productImage: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: 'Delhi',
    },
    // Booking Event details
    eventDate: {
      type: String,
      required: true,
    },
    eventTimeSlot: {
      type: String,
      default: 'Evening (04:00 PM - 08:00 PM)',
    },
    deliveryAddress: {
      type: String,
      default: '',
    },
    specialRequests: {
      type: String,
      default: '',
    },
    // Financial details (50% Advance & 50% On-Site)
    totalAmount: {
      type: Number,
      required: true,
    },
    advanceAmountPaid: {
      type: Number,
      required: true,
    },
    onSiteAmountPending: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet', 'cash_on_site'],
      default: 'upi',
    },
    transactionId: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['50%_ADVANCE_PAID', 'FULLY_PAID', 'PENDING', 'FAILED'],
      default: '50%_ADVANCE_PAID',
    },
    bookingStatus: {
      type: String,
      enum: ['CONFIRMED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
