const User = require('../models/User');
const Navigation = require('../models/Navigation');
const HomePage = require('../models/HomePage');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

const Booking = require('../models/Booking');

// @desc    Get all users (Admins & Customers with booking details)
// @route   GET /api/super-admin/users
// @access  Private/SuperAdmin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    // Fetch booking metrics for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const bookingsCount = await Booking.countDocuments({ user: u._id });
        const latestBooking = await Booking.findOne({ user: u._id })
          .sort({ createdAt: -1 })
          .select('bookingId productName eventDate totalAmount advanceAmountPaid paymentStatus bookingStatus createdAt');
        
        return {
          ...u.toObject(),
          bookingsCount,
          latestBooking,
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error loading users', error: error.message });
  }
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


// new changes done  by piyush dubey 

const superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email aur password dono required hain',
      });
    }

    // Explicitly select password kyunki schema me select: false hai
    const admin = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials',
      });
    }

    // Role check
    if (admin.role !== 'superadmin' && admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin rights nahi hain',
      });
    }

    // Account active check
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account inactive ya blocked hai',
      });
    }

    // Password match
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials',
      });
    }

    // Token generation
    const token = generateToken(admin);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getAllUsers,
  updateUserRole,
  superAdminLogin
};

