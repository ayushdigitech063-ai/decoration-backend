const express = require('express');
const router = express.Router();
const {
  registerUser,
  setupSuperAdmin,
  getUserProfile,
  sendOTP,
  verifyOTP,
  googleAuth,
  completeProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/setup-superadmin', setupSuperAdmin);
router.get('/profile', protect, getUserProfile);

router.post('/otp/send', sendOTP);
router.post('/otp/verify', verifyOTP);

router.post('/google', googleAuth);
router.put('/profile/complete', protect, completeProfile);

module.exports = router;