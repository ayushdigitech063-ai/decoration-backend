const User = require('../models/User');
const Navigation = require('../models/Navigation');
const HomePage = require('../models/HomePage');

// @desc    Get Super Admin Dashboard Overview
// @route   GET /api/super-admin/dashboard
// @access  Private/SuperAdmin
const getDashboardOverview = async (req, res) => {
  const userCount = await User.countDocuments({ role: 'user' });
  const adminCount = await User.countDocuments({ role: 'admin' });
  const superAdminCount = await User.countDocuments({ role: 'superadmin' });
  
  const topbarConfig = await Navigation.findOne({ type: 'topbar' });
  const sidebarConfig = await Navigation.findOne({ type: 'sidebar' });
  const homeSections = await HomePage.findOne();

  res.json({
    metrics: {
      totalUsers: userCount,
      totalAdmins: adminCount,
      totalSuperAdmins: superAdminCount,
    },
    structure: {
      topbarConfigured: !!topbarConfig,
      sidebarConfigured: !!sidebarConfig,
      homeSectionsConfigured: !!homeSections,
    },
  });
};

// @desc    Get all users (Admins & Users)
// @route   GET /api/super-admin/users
// @access  Private/SuperAdmin
const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

// @desc    Update user role (promote to Admin / revoke)
// @route   PUT /api/super-admin/users/:id/role
// @access  Private/SuperAdmin
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['superadmin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.role = role;
  await user.save();

  res.json({ message: `User role updated to ${role}`, user: { _id: user._id, name: user.name, role: user.role } });
};

module.exports = {
  getDashboardOverview,
  getAllUsers,
  updateUserRole,
};
