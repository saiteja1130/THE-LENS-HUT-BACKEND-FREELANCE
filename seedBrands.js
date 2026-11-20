import 'dotenv/config';
import mongoose from 'mongoose';
import Brand from './models/Brand.js';
import Product from './models/Product.js';

const defaultBrands = [
  {
    name: 'Ray-Ban',
    slug: 'ray-ban',
    description: 'Timeless style, authenticity and premium sun and prescription optics since 1937.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Ray-Ban_logo.svg/1200px-Ray-Ban_logo.svg.png',
    website: 'https://www.ray-ban.com',
    isFeatured: true,
    order: 1,
  },
  {
    name: 'Oakley',
    slug: 'oakley',
    description: 'High-performance sports eyewear, Prizm optics, and advanced ballistic protection.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Oakley_logo.svg/1280px-Oakley_logo.svg.png',
    website: 'https://www.oakley.com',
    isFeatured: true,
    order: 2,
  },
  {
    name: 'The Lens Hut Reserve',
    slug: 'the-lens-hut-reserve',
    description: 'Signature in-house handcrafted aerospace titanium and Italian acetate silhouettes.',
    logoUrl: 'https://the-lens-hut-frontend.vercel.app/images/logo.png',
    website: 'https://thelenshut.com',
    isFeatured: true,
    order: 3,
  },
  {
    name: 'Gucci',
    slug: 'gucci',
    description: 'Iconic Italian luxury fashion eyewear with bold contours and gold-toned accents.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/1990s_Gucci_logo.svg/2560px-1990s_Gucci_logo.svg.png',
    website: 'https://www.gucci.com',
    isFeatured: true,
    order: 4,
  },
  {
    name: 'Prada',
    slug: 'prada',
    description: 'Cutting-edge haute couture luxury sunwear and refined optical frames.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Prada-Logo.svg/1280px-Prada-Logo.svg.png',
    website: 'https://www.prada.com',
    isFeatured: true,
    order: 5,
  },
  {
    name: 'Tom Ford',
    slug: 'tom-ford',
    description: 'Distinguished luxury frames recognized by the signature metal T-temple emblem.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Tom_Ford_logo.svg/1200px-Tom_Ford_logo.svg.png',
    website: 'https://www.tomford.com',
    isFeatured: true,
    order: 6,
  },
  {
    name: 'Vogue Eyewear',
    slug: 'vogue-eyewear',
    description: 'Contemporary, vibrant frames designed for trendsetting everyday confidence.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Vogue_Eyewear_Logo.svg/1200px-Vogue_Eyewear_Logo.svg.png',
    website: 'https://www.vogue-eyewear.com',
    isFeatured: true,
    order: 7,
  },
  {
    name: 'Carrera',
    slug: 'carrera',
    description: 'Motorsport-heritage aviators and sporty lightweight eyewear for pioneers.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Carrera_logo.svg/1280px-Carrera_logo.svg.png',
    website: 'https://www.carreraworld.com',
    isFeatured: true,
    order: 8,
  },
];

const seedBrands = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed Brands] Connected to MongoDB');

    for (const b of defaultBrands) {
      const count = await Product.countDocuments({
        brand: new RegExp(`^${b.name}$`, 'i'),
      });

      await Brand.findOneAndUpdate(
        { slug: b.slug },
        { ...b, itemCount: count },
        { upsert: true, new: true }
      );
      console.log(`[Seed Brands] Upserted brand: ${b.name} (${count} products)`);
    }

    console.log('[Seed Brands] Successfully seeded all default brands.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Brands Error]:', error);
    process.exit(1);
  }
};

seedBrands();
