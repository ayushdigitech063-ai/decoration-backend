require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/partysquare';
    const conn = await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    // Read from .env, fallback to default if not provided
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@partysquare.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

    // 1. Check if an admin with this email or role already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'superadmin' }]
    });

    if (existingAdmin) {
      console.log(`⚠️ Super Admin already exists! (Email: ${existingAdmin.email})`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // 2. Hash password explicitly (Prevents login failure if pre-save hook is missing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 3. Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'superadmin',
      phone: '9999999999',
      isVerified: true
    });

    console.log('✅ Super Admin created successfully!');
    console.log(`Email: ${superAdmin.email}`);
    console.log('Role:', superAdmin.role);

    // Gracefully close connection
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedSuperAdmin();