import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // 1. Seed or update Admin
    let admin = await User.findOne({ email: 'admin@thelenshut.com' });
    if (!admin) {
      admin = new User({
        fullName: 'Store Administrator',
        email: 'admin@thelenshut.com',
        phone: '+91 99999 88888',
        password: 'admin123',
        role: 'admin',
        isEmailVerified: true,
      });
      await admin.save();
      console.log('[Seed] Admin user created: admin@thelenshut.com (password: admin123)');
    } else {
      admin.role = 'admin';
      admin.isEmailVerified = true;
      await admin.save();
      console.log('[Seed] Admin user verified: admin@thelenshut.com');
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
