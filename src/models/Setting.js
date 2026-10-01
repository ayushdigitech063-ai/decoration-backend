const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'general_settings',
    },
    businessName: {
      type: String,
      default: 'Party Square Celebrations',
    },
    adminEmail: {
      type: String,
      default: 'support@partysquare.com',
    },
    supportPhone: {
      type: String,
      default: '+91 8010679679',
    },
    whatsappNumber: {
      type: String,
      default: '8010679679', // 10 digit or country code format
    },
    currency: {
      type: String,
      default: 'INR (₹)',
    },
    emailAlerts: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
