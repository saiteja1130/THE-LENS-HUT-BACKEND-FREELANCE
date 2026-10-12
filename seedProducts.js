import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Category from './models/Category.js';

const seedProductsData = [
  {
    name: 'Vincent Chase Retro Classic',
    slug: 'vincent-chase-retro-classic',
    sku: 'VC-E1140-BLK',
    brand: 'Vincent Chase',
    category: 'Eyeglasses',
    categorySlug: 'eyeglasses',
    productType: 'eyeglasses',
    gender: 'Unisex',
    description: 'Timeless round acetate frame with sturdy flex hinges. Crafted for everyday durability and sleek minimalist aesthetics.',
    price: 1999,
    mrp: 2499,
    offerPrice: 1999,
    discountPercent: 20,
    stock: 18,
    status: 'active',
    isBestSeller: true,
    isNewArrival: false,
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 142,
    images: {
      front: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
      side: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
      angle: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
    },
    colors: [
      {
        id: 'c1',
        name: 'Jet Black',
        hex: '#111827',
        images: {
          front: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
        },
      },
      {
        id: 'c2',
        name: 'Tortoiseshell',
        hex: '#78350f',
        images: {
          front: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
        },
      },
      {
        id: 'c3',
        name: 'Crystal Clear',
        hex: '#e2e8f0',
        images: {
          front: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Round',
      frameType: 'Full Rim',
      material: 'Acetate',
      size: 'Medium',
      weight: '18g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: true,
      blueLightBlock: true,
      sunTint: true,
    },
  },
  {
    name: 'John Jacobs Titanium Executive',
    slug: 'john-jacobs-titanium-executive',
    sku: 'JJ-E1092-GUN',
    brand: 'John Jacobs',
    category: 'Eyeglasses',
    categorySlug: 'eyeglasses',
    productType: 'eyeglasses',
    gender: 'Men',
    description: 'Ultra-lightweight Japanese Titanium frame engineered for zero pressure on the nose bridge. Ideal for long boardroom meetings.',
    price: 4299,
    mrp: 4999,
    offerPrice: 4299,
    discountPercent: 14,
    stock: 12,
    status: 'active',
    isBestSeller: true,
    isNewArrival: true,
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 96,
    images: {
      front: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
      side: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80',
      angle: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
    },
    colors: [
      {
        id: 'c1',
        name: 'Gunmetal Gray',
        hex: '#475569',
        images: {
          front: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
        },
      },
      {
        id: 'c2',
        name: 'Matte Silver',
        hex: '#94a3b8',
        images: {
          front: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Rectangle',
      frameType: 'Half Rim',
      material: 'Titanium',
      size: 'Medium',
      weight: '12g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: true,
      blueLightBlock: true,
      sunTint: true,
    },
  },
  {
    name: 'Vogue Eyewear Cat-Eye Glam',
    slug: 'vogue-eyewear-cat-eye-glam',
    sku: 'VG-S2044-TOR',
    brand: 'Vogue Eyewear',
    category: 'Sunglasses',
    categorySlug: 'sunglasses',
    productType: 'sunglasses',
    gender: 'Women',
    description: 'Chic oversized cat-eye sunglasses featuring polarized gradient lenses with 100% UV400 sun defense.',
    price: 3199,
    mrp: 3999,
    offerPrice: 3199,
    discountPercent: 20,
    stock: 25,
    status: 'active',
    isBestSeller: false,
    isNewArrival: true,
    isFeatured: true,
    rating: 4.7,
    reviewsCount: 78,
    images: {
      front: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
      side: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
      angle: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
    },
    colors: [
      {
        id: 'c1',
        name: 'Havana Tortoise',
        hex: '#92400e',
        images: {
          front: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
        },
      },
      {
        id: 'c2',
        name: 'Ruby Wine',
        hex: '#881337',
        images: {
          front: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Cat-Eye',
      frameType: 'Full Rim',
      material: 'Acetate',
      size: 'Medium',
      weight: '24g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: false,
      blueLightBlock: false,
      sunTint: true,
    },
  },
  {
    name: 'Aqualens 24H Daily Disposable Contacts',
    slug: 'aqualens-24h-daily-disposable-contacts',
    sku: 'AL-C0010-CLR',
    brand: 'Aqualens',
    category: 'Contact Lenses',
    categorySlug: 'contact-lenses',
    productType: 'contact-lens',
    gender: 'Unisex',
    description: 'High-oxygen hydrogel daily contact lenses with HydraLock moisture matrix. 30 sterile blisters per pack.',
    price: 1199,
    mrp: 1499,
    offerPrice: 1199,
    discountPercent: 20,
    stock: 50,
    status: 'active',
    isBestSeller: true,
    isNewArrival: false,
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 210,
    images: {
      front: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
      side: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
      angle: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
    },
    colors: [
      {
        id: 'c1',
        name: 'Clear Aqua',
        hex: '#38bdf8',
        images: {
          front: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Round',
      frameType: 'Rimless',
      material: 'Hydrogel',
      size: 'Standard',
      weight: '0.1g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: false,
      blueLightBlock: false,
      sunTint: false,
    },
    contactLensConfig: {
      powerType: 'spherical',
      packSize: '30 Pieces / Box',
      piecesPerBox: 30,
    },
  },
  {
    name: 'The Lens Hut Optical Care Kit',
    slug: 'the-lens-hut-optical-care-kit',
    sku: 'TLH-ACC-KIT01',
    brand: 'The Lens Hut Reserve',
    category: 'Accessories',
    categorySlug: 'accessories',
    productType: 'accessories',
    gender: 'Unisex',
    description: 'All-in-one optical care system: Anti-fog microfiber cleaning cloth, 60ml pH-neutral lens cleansing spray, and hard shell vegan leather case.',
    price: 499,
    mrp: 699,
    offerPrice: 499,
    discountPercent: 28,
    stock: 40,
    status: 'active',
    isBestSeller: false,
    isNewArrival: false,
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 335,
    images: {
      front: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
      side: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
      angle: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
    },
    colors: [
      {
        id: 'c1',
        name: 'Midnight Navy',
        hex: '#1e293b',
        images: {
          front: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
          side: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
          angle: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Case',
      frameType: 'Protective Case',
      material: 'Vegan Leather',
      size: 'Universal',
      weight: '85g',
    },
    lensCompatibility: {
      zeroPower: false,
      singleVision: false,
      progressive: false,
      blueLightBlock: false,
      sunTint: false,
    },
  },
];

const seedProducts = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thelenshut';
    await mongoose.connect(mongoUri);
    console.log('[Seed Products] Connected to MongoDB');

    for (const prod of seedProductsData) {
      const exists = await Product.findOne({ sku: prod.sku });
      if (!exists) {
        await Product.create(prod);
        console.log(`[Seed Products] Created product: ${prod.name}`);
      } else {
        await Product.updateOne({ _id: exists._id }, { $set: prod });
        console.log(`[Seed Products] Updated product: ${prod.name}`);
      }
    }

    // Update Category itemCount
    const counts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
    ]);

    for (const item of counts) {
      await Category.updateOne({ slug: item._id }, { $set: { itemCount: item.count } });
    }

    console.log('[Seed Products] All sample products seeded successfully and category counts synced');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Products Error]:', error.message);
    process.exit(1);
  }
};

seedProducts();
