const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  isPopular: { type: Boolean, default: false },
  pageTarget: { type: String, required: true }, // Which page this package belongs to (e.g., 'wall-decoration', 'birthday')
  features: [{ type: String }] // Optional features list
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
