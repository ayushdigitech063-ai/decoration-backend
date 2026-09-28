const mongoose = require('mongoose');

const homeSectionSchema = new mongoose.Schema({
  sectionKey: {
    type: String,
    required: true,
    unique: true, // e.g. 'hero_banner', 'most_loved_decor', 'festivals', 'work', 'gallery', 'progress', 'services'
  },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isEnabled: { type: Boolean, default: true },
  contentData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const homePageSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Main Home Page Layout' },
    sections: [homeSectionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomePage', homePageSchema);
