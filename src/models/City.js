const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      unique: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String, // optional icon name or custom svg
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
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // SEO Meta Tags
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
    keywords: {
      type: [String],
      default: [],
    },
    // On-Page Content
    heading: {
      type: String,
      trim: true,
      default: '',
    },
    subheading: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    // Local Service Areas / Localities (e.g. Saket, Connaught Place, Dwarka)
    serviceAreas: {
      type: [String],
      default: [],
    },
    // Dynamic City FAQs for Rich Snippets Schema
    customSchema: { type: String, default: '' },
    faqs: [
      {
        question: { type: String, trim: true, default: '' },
        answer: { type: String, trim: true, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto-populate slug from name if not provided
citySchema.pre('save', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('City', citySchema);
