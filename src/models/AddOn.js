const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'recommended' },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    description: { type: String, default: '' },
    details: { type: String, default: '' },
    popular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AddOn', addOnSchema);
