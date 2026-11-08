import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('[Info] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Info] Connected to database:', mongoose.connection.name);

    // List all databases on this cluster to see if another db has data
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('[Info] Databases on cluster:', dbs.databases.map(d => `${d.name} (${d.sizeOnDisk} bytes)`));

    const targetEmail = 'admin@gmail.com';
    const targetPassword = '123456';

    let user = await User.findOne({ email: targetEmail });
    if (!user) {
      user = new User({
        fullName: 'Admin',
        email: targetEmail,
        phone: '+91 99999 99999',
        password: targetPassword,
        role: 'admin',
        isEmailVerified: true,
      });
      await user.save();
      console.log(`[Success] Created admin user: ${targetEmail}`);
    } else {
      user.role = 'admin';
      user.isEmailVerified = true;
      user.password = targetPassword; // Will trigger pre-save bcrypt hook
      await user.save();
      console.log(`[Success] Updated existing user ${targetEmail} to admin with new password.`);
    }

    // Verify password match using the User model method
    const verifyUser = await User.findOne({ email: targetEmail }).select('+password');
    const isMatch = await verifyUser.matchPassword(targetPassword);
    console.log(`[Verification] Password match check: ${isMatch ? 'PASSED' : 'FAILED'}`);
    console.log(`[User Details] ID: ${verifyUser._id}, Role: ${verifyUser.role}, Verified: ${verifyUser.isEmailVerified}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Error]:', err.message);
    process.exit(1);
  }
};

run();

