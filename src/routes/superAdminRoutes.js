const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getAllUsers,
  updateUserRole,
  superAdminLogin
} = require('../controllers/superAdminController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

router.post('/login', superAdminLogin);

router.use(protect);
router.use(superAdminOnly);

router.get('/dashboard', getDashboardOverview);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

// piyush changes 



module.exports = router;
