const mongoose = require('mongoose');

const navigationItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  path: { type: String, required: true },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  badge: { type: String, default: '' },
  children: [
    {
      title: { type: String, required: true },
      path: { type: String, required: true },
      icon: { type: String, default: '' },
      order: { type: Number, default: 0 },
      isVisible: { type: Boolean, default: true },
    },
  ],
});

const navigationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['topbar', 'sidebar', 'admin_sidebar', 'admin_topbar'],
      required: true,
      unique: true,
    },
    items: [navigationItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Navigation', navigationSchema);
