const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from server root .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

// Helper to parse CLI arguments (e.g. --email=myadmin@auroragrace.com --password=secret)
const getArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (arg) return arg.substring(prefix.length).trim();
  return fallback;
};

const initializeAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/auroragrace';
    console.log('Connecting to MongoDB to initialize the admin account...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });

    const admins = await User.find({ role: 'admin' }).select('email').lean();
    if (admins.length > 1) {
      throw new Error(`Found ${admins.length} admin accounts. No records were changed; review them manually.`);
    }

    if (admins.length === 1) {
      console.log(`Admin account already exists: ${admins[0].email}. No records were changed.`);
      return;
    }

    const adminEmail = (getArg('email', process.env.ADMIN_EMAIL) || '').toLowerCase().trim();
    const adminPassword = getArg('password', process.env.ADMIN_PASSWORD);
    if (!adminEmail || !adminPassword) {
      throw new Error('No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env to initialize one.');
    }
    const adminName = getArg('name', process.env.ADMIN_NAME) || 'Aurora Grace Admin';
    const adminPhone = getArg('phone', process.env.ADMIN_PHONE) || '+1 555-0199';

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      throw new Error(`An account already uses ${adminEmail} with role "${existingUser.role}". No records were changed.`);
    }

    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      role: 'admin',
      isVerified: true
    });

    const testAdmin = await User.findById(admin._id);
    const passMatches = await testAdmin.comparePassword(adminPassword);
    if (!passMatches) {
      throw new Error('Verification failed: Password comparison with bcrypt returned false.');
    }

    console.log(`Admin account initialized: ${testAdmin.email} (role: ${testAdmin.role}, verified: ${testAdmin.isVerified}).`);
    console.log('Password hashing was verified; the password was not displayed.');
  } catch (error) {
    console.error('Failed to initialize admin:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

initializeAdmin();
