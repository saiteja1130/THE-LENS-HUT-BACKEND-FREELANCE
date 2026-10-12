import 'dotenv/config';
import mongoose from 'mongoose';
import Banner from './models/Banner.js';

const defaultBanners = [
  {
    title: 'Premium Eyewear for Every You',
    headline: 'Style Meets Vision',
    kicker: 'STYLE MEETS VISION',
    subtitle: 'Trendy frames. Clear vision. A better tomorrow.',
    imageUrl: '/images/home/hero-slide-1.png',
    link: '/shop',
    buttonText: 'Shop Now',
    secondaryBtnText: 'Explore Collection',
    secondaryBtnLink: '/shop',
    bgColor: '#FAF8F5',
    position: 'hero',
    order: 1,
    isActive: true,
    targetCategory: 'Eyeglasses',
  },
  {
    title: 'Crafted for Sun, Styled for Living',
    headline: 'Polarized Sun Protection',
    kicker: 'POLARIZED SUN PROTECTION',
    subtitle: 'High-contrast optical grade polarized sunglasses for road and water.',
    imageUrl: '/images/home/hero-slide-1.png',
    link: '/sunglasses',
    buttonText: 'Shop Sunglasses',
    secondaryBtnText: 'Explore Polarized',
    secondaryBtnLink: '/sunglasses',
    bgColor: '#F0F5F9',
    position: 'hero',
    order: 2,
    isActive: true,
    targetCategory: 'Sunglasses',
  },
  {
    title: 'Breathable Comfort, Crisp Focus',
    headline: 'All-Day Hydration',
    kicker: 'ALL-DAY HYDRATION',
    subtitle: 'HydraLock hydrogel contact lenses for extended screen time and sports.',
    imageUrl: '/images/home/hero-slide-1.png',
    link: '/contact-lenses',
    buttonText: 'Shop Contact Lenses',
    secondaryBtnText: 'Explore Modalities',
    secondaryBtnLink: '/contact-lenses',
    bgColor: '#F9F5F0',
    position: 'hero',
    order: 3,
    isActive: true,
    targetCategory: 'Contact Lenses',
  },
];

const seedBanners = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed Banners] Connected to MongoDB');

    for (const b of defaultBanners) {
      const exists = await Banner.findOne({ title: b.title });
      if (!exists) {
        await Banner.create(b);
        console.log(`[Seed Banners] Created banner: ${b.title}`);
      } else {
        await Banner.updateOne({ _id: exists._id }, { $set: b });
        console.log(`[Seed Banners] Updated banner: ${b.title}`);
      }
    }

    console.log('[Seed Banners] All default banners seeded successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Banners Error]:', error.message);
    process.exit(1);
  }
};

seedBanners();
