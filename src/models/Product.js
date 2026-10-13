const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  fullDescription: { type: String, default: '' },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  image: { type: String, required: true },
  images: [{ type: String }],
  
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  
  sku: { type: String, default: '' },
  stock: { type: Number, default: 100 },
  
  availability: { type: Boolean, default: true },
  included: [{ type: String }],
  notIncluded: [{ type: String }],
  cancellationPolicy: { type: String, default: '' },
  
  rating: { type: Number, default: 4.8 },
  reviewCount: { type: Number, default: 50 },
  badge: { type: String, default: 'Verified Quality Product' },
  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],
  
  theme: { type: String, default: '' },
  gradientBg: { type: String, default: '' },
  isSpecialCard: { type: Boolean, default: false },
  availableCities: [{ type: String }],

  // City-specific content, SEO Meta Tags, and Custom pricing overrides
  cityOverrides: [{
    cityName: { type: String, required: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaKeywords: { type: String, default: '' },
    customTitle: { type: String, default: '' },
    customDescription: { type: String, default: '' },
    customPrice: { type: Number }
  }]
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ availability: 1 });

module.exports = mongoose.model('Product', productSchema);
