const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  mobileLogin,
  mobileRegister,
  checkMobile,
  setupSuperAdmin,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/check-mobile', checkMobile);
router.post('/mobile-login', mobileLogin);
router.post('/mobile-register', mobileRegister);
router.post('/setup-superadmin', setupSuperAdmin);
router.get('/profile', protect, getUserProfile);

module.exports = router;
