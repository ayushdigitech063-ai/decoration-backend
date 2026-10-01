const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, adminOrSuperAdmin, superAdminOnly } = require('../middleware/authMiddleware');

// @desc    Get general settings (Public)
// @route   GET /api/settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'general_settings' });
    if (!setting) {
      setting = await Setting.create({
        key: 'general_settings',
        businessName: 'Party Square Celebrations',
        adminEmail: 'support@partysquare.com',
        supportPhone: '+91 8010679679',
        whatsappNumber: '8010679679',
        currency: 'INR (₹)',
        emailAlerts: true,
      });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving settings', error: error.message });
  }
});

// @desc    Update general settings (Super Admin Only)
// @route   PUT /api/settings
// @access  Private/SuperAdmin
router.put('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { businessName, adminEmail, supportPhone, whatsappNumber, currency, emailAlerts } = req.body;

    let setting = await Setting.findOne({ key: 'general_settings' });
    if (!setting) {
      setting = new Setting({ key: 'general_settings' });
    }

    if (businessName !== undefined) setting.businessName = businessName;
    if (adminEmail !== undefined) setting.adminEmail = adminEmail;
    if (supportPhone !== undefined) setting.supportPhone = supportPhone;
    if (whatsappNumber !== undefined) setting.whatsappNumber = whatsappNumber;
    if (currency !== undefined) setting.currency = currency;
    if (emailAlerts !== undefined) setting.emailAlerts = emailAlerts;

    const updated = await setting.save();
    res.json({ message: 'Settings successfully updated', setting: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

module.exports = router;
