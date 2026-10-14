const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  pageTarget: { 
    type: String, 
    required: true, 
    enum: ['wall-decoration', 'birthday', 'birthday-mother', 'ring-decoration', 'general'],
    default: 'wall-decoration' 
  },
  category: { type: String, default: 'Showcase' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);
