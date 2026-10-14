const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getAllUsers,
  updateUserRole,
  superAdminLogin,
  getAnalyticsReport
} = require('../controllers/superAdminController');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

router.post('/login', superAdminLogin);

router.use(protect);
router.use(adminOrSuperAdmin);

router.get('/dashboard', getDashboardOverview);
router.get('/analytics', getAnalyticsReport);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

module.exports = router;

