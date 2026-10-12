import 'dotenv/config';
import mongoose from 'mongoose';
import Category from './models/Category.js';

const defaultCategories = [
  {
    name: 'Eyeglasses',
    slug: 'eyeglasses',
    subtitle: 'Classic / Modern / Everyday',
    description: 'Precision optical prescription eyewear and blue light frames.',
    imageUrl: '/images/home/cat-eyeglasses.png',
    link: '/eyeglasses',
    order: 1,
    isActive: true,
    isFeatured: true,
    itemCount: 120,
  },
  {
    name: 'Sunglasses',
    slug: 'sunglasses',
    subtitle: 'Style / UV Protection / Premium',
    description: 'High-contrast optical grade polarized sunglasses for road and water.',
    imageUrl: '/images/home/cat-sunglasses.png',
    link: '/sunglasses',
    order: 2,
    isActive: true,
    isFeatured: true,
    itemCount: 85,
  },
  {
    name: 'Contact Lenses',
    slug: 'contact-lenses',
    subtitle: 'Clear Vision / Comfort / Daily',
    description: 'HydraLock hydrogel daily and monthly contact lenses.',
    imageUrl: '/images/home/cat-sunglasses.png',
    link: '/contact-lenses',
    order: 3,
    isActive: true,
    isFeatured: true,
    itemCount: 29,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    subtitle: 'Cases / Cleaners / More',
    description: 'Microfiber lens cloths, anti-fog cleaning sprays, and protective cases.',
    imageUrl: '/images/home/cat-sunglasses.png',
    link: '/accessories',
    order: 4,
    isActive: true,
    isFeatured: true,
    itemCount: 38,
  },
];

const seedCategories = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed Categories] Connected to MongoDB');

    for (const cat of defaultCategories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (!exists) {
        await Category.create(cat);
        console.log(`[Seed Categories] Created category: ${cat.name}`);
      } else {
        await Category.updateOne({ _id: exists._id }, { $set: cat });
        console.log(`[Seed Categories] Updated category: ${cat.name}`);
      }
    }

    console.log('[Seed Categories] All default categories seeded successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Categories Error]:', error.message);
    process.exit(1);
  }
};

seedCategories();
