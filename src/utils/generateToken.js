// src/utils/generateToken.js
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for any user role
 * @param {Object} user - User document from DB
 * @param {string} expiresIn - Optional custom expiry
 */
const generateToken = (user, expiresIn = null) => {
  const payload = {
    id: user._id,
    role: user.role,
  };

  // Admin aur Super Admin ke liye short-lived token (12h), normal user ke liye 30d
  const tokenExpiry =
    expiresIn ||
    (user.role === 'superadmin' || user.role === 'admin'
      ? '12h'
      : process.env.JWT_EXPIRE || '30d');

  return jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key', {
    expiresIn: tokenExpiry,
  });
};

module.exports = generateToken;