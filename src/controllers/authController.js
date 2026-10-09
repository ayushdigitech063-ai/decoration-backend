const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateToken = require("../utils/generateToken")
const crypto = require("crypto")
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET || 'superadmin_secret_key_partysquare_2026', {
//     expiresIn: '30d',
//   });
// };

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// const registerUser = async (req, res) => {
//   const { name, email, password, phone } = req.body;

//   const userExists = await User.findOne({ email });
//   if (userExists) {
//     return res.status(400).json({ message: 'User already exists' });
//   }

//   const user = await User.create({ name, email, password, phone, role: 'user' });

//   if (user) {
//     res.status(201).json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone || '',
//       role: user.role,
//       createdAt: user.createdAt,
//       token: generateToken(user._id),
//     });
//   } else {
//     res.status(400).json({ message: 'Invalid user data' });
//   }
// };

// @desc    Check if mobile number exists in database
// @route   POST /api/auth/check-mobile
// @access  Public
// const checkMobile = async (req, res) => {
//   const { phone } = req.body;
//   if (!phone || phone.length < 10) {
//     return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
//   }

//   const cleanPhone = phone.trim();
//   const user = await User.findOne({ phone: cleanPhone });

//   res.json({
//     exists: !!user,
//     name: user ? user.name : null,
//     message: user ? 'Account found' : 'Account not registered',
//   });
// };

// @desc    Customer Strict Mobile Login (User MUST already exist in DB)
// @route   POST /api/auth/mobile-login
// @access  Public
// const mobileLogin = async (req, res) => {
//   const { phone, otp } = req.body;

//   if (!phone || phone.length < 10) {
//     return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
//   }

//   const cleanPhone = phone.trim();
//   const user = await User.findOne({ phone: cleanPhone });

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'Account not found! This mobile number is not registered. Please register first.',
//     });
//   }

//   // OTP Bypass check: If OTP is supplied, check length
//   if (otp && String(otp).trim().length !== 4) {
//     return res.status(400).json({ message: 'Please enter a valid 4-digit OTP' });
//   }

//   res.json({
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     phone: user.phone,
//     role: user.role,
//     createdAt: user.createdAt,
//     token: generateToken(user._id),
//   });
// };

// @desc    Customer Strict Mobile Register (Checks if ALREADY registered)
// @route   POST /api/auth/mobile-register
// @access  Public
// const mobileRegister = async (req, res) => {
//   const { phone, name, email, otp } = req.body;

//   if (!phone || phone.length < 10) {
//     return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
//   }

//   if (!name || !name.trim()) {
//     return res.status(400).json({ message: 'Full Name is required for new registration' });
//   }

//   const cleanPhone = phone.trim();
//   const userExists = await User.findOne({ phone: cleanPhone });

//   if (userExists) {
//     return res.status(400).json({
//       success: false,
//       message: 'This mobile number is already registered! Please login instead.',
//     });
//   }

//   // OTP Bypass check
//   if (otp && String(otp).trim().length !== 4) {
//     return res.status(400).json({ message: 'Please enter a valid 4-digit OTP' });
//   }

//   // Generate safe email if not provided
//   const autoEmail = (email && email.trim()) || `user_${cleanPhone}@partysquare.in`;
//   const existingEmail = await User.findOne({ email: autoEmail });
//   const finalEmail = existingEmail ? `user_${cleanPhone}_${Date.now()}@partysquare.in` : autoEmail;

//   const newUser = await User.create({
//     name: name.trim(),
//     email: finalEmail,
//     phone: cleanPhone,
//     password: `PS@${cleanPhone.slice(-4)}#2026`,
//     role: 'user',
//   });

//   res.status(201).json({
//     _id: newUser._id,
//     name: newUser.name,
//     email: newUser.email,
//     phone: newUser.phone,
//     role: newUser.role,
//     createdAt: newUser.createdAt,
//     token: generateToken(newUser._id),
//   });
// };

// const mobileLoginOrRegister = mobileLogin;

// @desc    Login user / admin / superadmin
// @route   POST /api/auth/login
// @access  Public
// const loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });

//   if (user && (await user.matchPassword(password))) {
//     res.json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone || '',
//       role: user.role,
//       createdAt: user.createdAt,
//       token: generateToken(user._id),
//     });
//   } else {
//     res.status(401).json({ message: 'Invalid email or password' });
//   }
// };

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

// new controlles 


const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
    }
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    let userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const newUser = await User.create({
      name,
      email,
      phone,
      authProvider: 'phone_otp',
      isProfileComplete: true
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please login.',
    });
  } catch (error) {
    next(error);
  }
};
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number enter kijiye',
      });
    }

    // 6 digit OTP
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = '123456';
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minute validity

    // Hash OTP before storing
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    let user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register.",
      });
    }

    user.otp = hashedOtp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log(`[DEV OTP]: ${otp} for phone ${phone}`);

    res.status(200).json({
      success: true,
      message: 'OTP bhej diya gaya hai',
    });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone aur OTP dono required hain',
      });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      phone,
      otp: hashedOtp,
      otpExpires: { $gt: Date.now() },
    }).select('+otp +otpExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ya expired OTP',
      });
    }

    // Reset OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      isProfileComplete: user.isProfileComplete,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google token required hai',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        googleId,
        email: email.toLowerCase(),
        name: name || 'Google User',
        avatar: picture || '',
        authProvider: 'google',
        isProfileComplete: false,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      requiresPhone: !user.phone,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid Google token',
    });
  }
};

const completeProfile = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User nahi mila' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email.toLowerCase();
    user.isProfileComplete = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile update ho gaya',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  // registerUser,
  // loginUser,
  // mobileLogin,
  // mobileRegister,
  // checkMobile,
  // mobileLoginOrRegister,
  setupSuperAdmin,
  getUserProfile,
  sendOTP,
  verifyOTP,
  googleAuth,
  completeProfile
};  
