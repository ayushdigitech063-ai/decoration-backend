const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'superadmin_secret_key_partysquare_2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({ name, email, password, phone, role: 'user' });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Login user / admin / superadmin
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc    Setup initial Super Admin if none exists
// @route   POST /api/auth/setup-superadmin
// @access  Public (Only if no superadmin exists)
const setupSuperAdmin = async (req, res) => {
  const superAdminExists = await User.findOne({ role: 'superadmin' });
  if (superAdminExists) {
    return res.status(400).json({ message: 'Super Admin already exists. Initial setup disabled.' });
  }

  const { name, email, password, phone } = req.body;
  const superAdmin = await User.create({
    name: name || 'Super Admin',
    email: email || 'superadmin@partysquare.com',
    password: password || 'SuperAdmin@123',
    phone: phone || '',
    role: 'superadmin',
  });

  res.status(201).json({
    message: 'Super Admin created successfully',
    _id: superAdmin._id,
    name: superAdmin.name,
    email: superAdmin.email,
    role: superAdmin.role,
    token: generateToken(superAdmin._id),
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  setupSuperAdmin,
  getUserProfile,
};
