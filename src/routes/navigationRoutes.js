const express = require('express');
const router = express.Router();
const {
  getNavigation,
  updateNavigation,
} = require('../controllers/navigationController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

router.get('/:type', getNavigation);
router.put('/:type', protect, superAdminOnly, updateNavigation);

module.exports = router;
