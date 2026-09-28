const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getAllUsers,
  updateUserRole,
} = require('../controllers/superAdminController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(superAdminOnly);

router.get('/dashboard', getDashboardOverview);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

module.exports = router;
