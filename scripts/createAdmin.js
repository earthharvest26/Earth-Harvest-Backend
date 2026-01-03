/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js <email> <name>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const { connectDB } = require('../config/db');

const createAdmin = async () => {
  try {
    await connectDB();

    const email = process.argv[2];
    const name = process.argv[3] || 'Admin';

    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('Usage: node scripts/createAdmin.js <email> <name>');
      process.exit(1);
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      user.isVerified = true;
      await user.save();
      console.log(`✅ User ${email} has been updated to admin role`);
    } else {
      // Create new admin user
      user = await User.create({
        name,
        email,
        role: 'admin',
        isVerified: true
      });
      console.log(`✅ Admin user created: ${email}`);
    }

    console.log(`\nAdmin Details:`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`\n⚠️  Note: Admin will need to login via OTP to get JWT token`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

