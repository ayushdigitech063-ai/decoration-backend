// src/models/City.js
const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true, // e.g. 'jaipur', 'delhi' (Frontend URL routing ke liye)
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String, // City skyline ya landmark icon URL
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

citySchema.index({ slug: 1, isActive: 1 });
citySchema.set('toJSON', { virtuals: true });
citySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('City', citySchema);