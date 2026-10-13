import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // 1. Seed or update Admin
    let admin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@thelenshut.com' });
    const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'Admin@LH_2026!Secure');
    if (!adminPassword && process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_PASSWORD must be configured in environment before running seed script in production.');
    }

    if (!admin) {
      admin = new User({
        fullName: 'Store Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@thelenshut.com',
        phone: process.env.ADMIN_PHONE || '+91 99999 88888',
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
      });
      await admin.save();
      console.log(`[Seed] Admin user created: ${admin.email}`);
    } else {
      admin.role = 'admin';
      admin.isEmailVerified = true;
      if (process.env.ADMIN_PASSWORD) {
        admin.password = process.env.ADMIN_PASSWORD;
      }
      await admin.save();
      console.log(`[Seed] Admin user verified: ${admin.email}`);
    }

    // 2. Seed or update Demo Verified User
    let demoUser = await User.findOne({ email: 'user@thelenshut.com' });
    if (!demoUser) {
      demoUser = new User({
        fullName: 'John Doe',
        email: 'user@thelenshut.com',
        phone: '+91 98765 43210',
        password: 'user123',
        role: 'user',
        isEmailVerified: true,
      });
      await demoUser.save();
      console.log('[Seed] Demo user created: user@thelenshut.com (password: user123)');
    } else {
      demoUser.role = 'user';
      demoUser.isEmailVerified = true;
      await demoUser.save();
      console.log('[Seed] Demo user verified: user@thelenshut.com');
    }

    await mongoose.disconnect();
    console.log('[Seed] Seeding finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err.message);
    process.exit(1);
  }
};

seedUsers();
