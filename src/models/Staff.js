const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff member name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['Lead Decorator', 'Balloon Artist', 'Delivery Specialist', 'Event Manager', 'Electrician / Lights'],
      default: 'Lead Decorator',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'Operating city is required'],
      default: 'Delhi',
    },
    serviceAreas: {
      type: [String],
      default: [],
    },
    assignedBookingsCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Staff', staffSchema);
