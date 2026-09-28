require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedSuperAdmin = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/partysquare');
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Super Admin already exists with email:', existingSuperAdmin.email);
      process.exit(0);
    }

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@partysquare.com',
      password: 'SuperAdmin@123',
      role: 'superadmin',
      phone: '9999999999',
    });

    console.log('✅ Super Admin created successfully!');
    console.log('Email:', superAdmin.email);
    console.log('Password: SuperAdmin@123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
