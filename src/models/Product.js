// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product/Decoration name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['decoration', 'product'],
      default: 'decoration',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Short description is required'],
    },
    fullDescription: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Base selling price is required'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number, // MRP / Cut-price discount show karne ke liye
    },
    image: {
      type: String,
      required: [true, 'Main display image is required'],
    },
    images: [{ type: String }],

    // Category Hierarchy
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Main Category is required'],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    // City Availability (Both for Decoration and Retail Products)
    availableCities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
      },
    ],
    isAllCities: {
      type: Boolean,
      default: false, // true = All cities (Pan-India)
    },

    // Package Inclusions
    included: [{ type: String }],
    notIncluded: [{ type: String }],
    
    // Retained Fields
    cancellationPolicy: {
      type: String,
      default: 'Free cancellation up to 24 hours before the event slot.',
    },
    badge: {
      type: String,
      default: 'Verified Quality Product',
    },

    // Frequently Asked Questions
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],

    // Stats & Visibility Controls
    rating: {
      type: Number,
      default: 4.8,
    },
    reviewCount: {
      type: Number,
      default: 25,
    },
    order: {
      type: Number,
      default: 0,
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// High Performance Indexing
productSchema.index({ slug: 1 });
productSchema.index({ availableCities: 1, availability: 1 });
productSchema.index({ category: 1, subcategory: 1, availability: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Frontend virtual ID mapping (_id -> id)
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);