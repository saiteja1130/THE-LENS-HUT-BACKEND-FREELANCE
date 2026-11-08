import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
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
  {
    name: 'Emporio Armani EA3098 Spectacle',
    slug: 'emporio-armani-ea3098-spectacle',
    sku: 'EA-3098-5029',
    brand: 'Emporio Armani',
    category: 'Eyeglasses',
    categorySlug: 'eyeglasses',
    productType: 'eyeglasses',
    gender: 'Men',
    description: 'Distinctive rectangular acetate spectacles by Emporio Armani featuring refined temple eagle branding, ergonomic nose pads, and lightweight Italian craftsmanship suited for everyday prescription wear.',
    price: 9432,
    mrp: 11790,
    offerPrice: 9432,
    discountPercent: 20,
    stock: 20,
    status: 'active',
    isBestSeller: true,
    isNewArrival: false,
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 112,
    images: {
      front: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_1_1200x1200.jpg',
      side: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_3_1200x1200.jpg',
      angle: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_2_1200x1200.jpg',
    },
    colors: [
      {
        id: 'c1',
        name: 'Transparent Grey',
        hex: '#71717A',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_1_1200x1200.jpg',
          side: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_3_1200x1200.jpg',
          angle: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_2_1200x1200.jpg',
        },
      },
      {
        id: 'c2',
        name: 'Shiny Crystal',
        hex: '#E2E8F0',
        images: {
          front: 'https://edgeopticals.com/cdn/shop/files/2_d1067458-862e-4cc3-90af-f1d10faf8e05.png?v=1775288975&width=940',
          side: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_3_1200x1200.jpg',
          angle: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_2_1200x1200.jpg',
        },
      },
      {
        id: 'c3',
        name: 'Shiny Striped Blue',
        hex: '#1E3A8A',
        images: {
          front: 'https://www.smartbuyglasses.com/image4/2/8/433814_1599515004258.jpg?width=640&height=320',
          side: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_3_1200x1200.jpg',
          angle: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_2_1200x1200.jpg',
        },
      },
      {
        id: 'c4',
        name: 'Matte Black & Striped Grey',
        hex: '#18181B',
        images: {
          front: 'https://optorium.in/cdn/shop/files/Emporio_Armani_Frame_EA_3098_5566-01_837b1915-233d-4988-b89e-b70d3a3f556a.webp?v=1758108605&width=2048',
          side: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_3_1200x1200.jpg',
          angle: 'https://himalayaoptical.com/cdn/shop/products/8056597534864_2_1200x1200.jpg',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Rectangle',
      frameType: 'Full Rim',
      material: 'Acetate',
      size: 'Medium',
      weight: '19g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: true,
      blueLightBlock: true,
      sunTint: true,
    },
    eyeglassesConfig: {
      lensTypes: ['frame-only', 'single-vision', 'progressive'],
      prescriptionConfig: {
        allowManual: true,
        allowUpload: true,
        requireAddForProgressive: true,
      },
    },
  },
  {
    name: 'Ray-Ban 5389I Spectacle',
    slug: 'ray-ban-5389i-spectacle',
    sku: 'RB-5389I-2000',
    brand: 'Ray-Ban',
    category: 'Eyeglasses',
    categorySlug: 'eyeglasses',
    productType: 'eyeglasses',
    gender: 'Unisex',
    description: 'Iconic Ray-Ban RB5389I rectangle spectacles engineered with an Asian/Indian ergonomic fit, high-grade shell acetate, and signature embossed rivets for lasting style and lightweight comfort.',
    price: 5690,
    mrp: 5690,
    offerPrice: 5690,
    discountPercent: 0,
    stock: 24,
    status: 'active',
    isBestSeller: true,
    isNewArrival: true,
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 168,
    images: {
      front: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB5389I_2000_images_01_f8add39b-26b0-4c89-ba17-839bbd2e6af9.jpg?v=1754383637&width=2048',
      side: 'https://edgeopticals.com/cdn/shop/files/2_edb9bc18-8550-4145-acf9-2bedc68d2ff3.png?v=1775287665&width=940',
      angle: 'https://himalayaoptical.com/cdn/shop/products/8056597261876_2_93385778-99f9-4ff2-88d3-22cb1313cb76_1200x1200.jpg?v=1655115230',
    },
    colors: [
      {
        id: 'c1',
        name: 'Black',
        hex: '#000000',
        images: {
          front: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB5389I_2000_images_01_f8add39b-26b0-4c89-ba17-839bbd2e6af9.jpg?v=1754383637&width=2048',
          side: 'https://edgeopticals.com/cdn/shop/files/2_edb9bc18-8550-4145-acf9-2bedc68d2ff3.png?v=1775287665&width=940',
          angle: 'https://img.tatacliq.com/images/i18//437Wx649H/MP000000022729261_437Wx649H_202406281423261.jpeg',
        },
      },
      {
        id: 'c2',
        name: 'Transparent Grey',
        hex: '#64748B',
        images: {
          front: 'https://www.shop-srgopalrao.co/cdn/shop/files/fr045251-ray-ban-rb-5389i-8221-optical-frame-2_550x.webp',
          side: 'https://www.rkumar.in/cdn/shop/files/2_b40c2f29-4e7b-4463-a91c-57b2ef6c999e.jpg',
          angle: 'https://himalayaoptical.com/cdn/shop/products/8056597261876_2_93385778-99f9-4ff2-88d3-22cb1313cb76_1200x1200.jpg?v=1655115230',
        },
      },
      {
        id: 'c3',
        name: 'Transparent Light Blue',
        hex: '#38BDF8',
        images: {
          front: 'https://siddharthopticals.in/cdn/shop/files/0RX5389I__8371__P21__noshad__fr_grande.jpg',
          side: 'https://edgeopticals.com/cdn/shop/files/2_edb9bc18-8550-4145-acf9-2bedc68d2ff3.png?v=1775287665&width=940',
          angle: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB5389I_8371_images_01_aa56cdf8-1de9-4766-9825-d373822a13f2.jpg',
        },
      },
      {
        id: 'c4',
        name: 'Olive Green',
        hex: '#3F6212',
        images: {
          front: 'https://www.shop-srgopalrao.co/cdn/shop/files/fr045251-ray-ban-rb-5389i-8221-optical-frame-2_550x.webp',
          side: 'https://edgeopticals.com/cdn/shop/files/2_edb9bc18-8550-4145-acf9-2bedc68d2ff3.png?v=1775287665&width=940',
          angle: 'https://www.rkumar.in/cdn/shop/files/2_b40c2f29-4e7b-4463-a91c-57b2ef6c999e.jpg',
        },
      },
      {
        id: 'c5',
        name: 'Matte Black',
        hex: '#18181B',
        images: {
          front: 'https://www.rkumar.in/cdn/shop/files/1_b65cc02e-3c9f-47cd-aa87-54c3ab9297fd.jpg',
          side: 'https://edgeopticals.com/cdn/shop/files/2_edb9bc18-8550-4145-acf9-2bedc68d2ff3.png?v=1775287665&width=940',
          angle: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB5389I_2000_images_01_f8add39b-26b0-4c89-ba17-839bbd2e6af9.jpg?v=1754383637&width=2048',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Rectangle',
      frameType: 'Full Rim',
      material: 'Shell',
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
    eyeglassesConfig: {
      lensTypes: ['frame-only', 'single-vision', 'progressive'],
      prescriptionConfig: {
        allowManual: true,
        allowUpload: true,
        requireAddForProgressive: true,
      },
    },
  },
  {
    name: 'Ray-Ban 7027I Spectacle',
    slug: 'ray-ban-7027i-spectacle',
    sku: 'RB-7027I-2000',
    brand: 'Ray-Ban',
    category: 'Eyeglasses',
    categorySlug: 'eyeglasses',
    productType: 'eyeglasses',
    gender: 'Unisex',
    description: 'Precision engineered Ray-Ban RB7027I optical spectacles built with ultra-flexible nylon polymers for featherweight comfort, active endurance, and contemporary full-rim geometry.',
    price: 5690,
    mrp: 5690,
    offerPrice: 5690,
    discountPercent: 0,
    stock: 28,
    status: 'active',
    isBestSeller: false,
    isNewArrival: true,
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 145,
    images: {
      front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_1_1024x1024.jpg?v=1617353439',
      side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
      angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_2_1024x1024.jpg?v=1617353439',
    },
    colors: [
      {
        id: 'c1',
        name: 'Black',
        hex: '#000000',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_1_1024x1024.jpg?v=1617353439',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_2_1024x1024.jpg?v=1617353439',
        },
      },
      {
        id: 'c2',
        name: 'Brown',
        hex: '#78350F',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_1_1024x1024.jpg?v=1617353439',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_3_1024x1024.jpg?v=1617353439',
          angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_2_1024x1024.jpg?v=1617353439',
        },
      },
      {
        id: 'c3',
        name: 'Blue',
        hex: '#1E40AF',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_1_1024x1024.jpg?v=1617353439',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_2_1024x1024.jpg?v=1617353439',
        },
      },
      {
        id: 'c4',
        name: 'Transparent',
        hex: '#E2E8F0',
        images: {
          front: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB7027I_2001_images_01_7926a3f9-4a89-44b7-af80-a726347cfd99.jpg?v=1754383644&width=2048',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://optorium.in/cdn/shop/files/Rayban_Frame_RB7027I_2001_images_01_7926a3f9-4a89-44b7-af80-a726347cfd99.jpg?v=1754383644&width=2048',
        },
      },
      {
        id: 'c5',
        name: 'Transparent Blue',
        hex: '#3B82F6',
        images: {
          front: 'https://siddharthopticals.in/cdn/shop/files/0RX7027I__6749__P21__noshad__fr_grande.jpg?v=1777276731',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://siddharthopticals.in/cdn/shop/files/0RX7027I__6749__P21__noshad__fr_grande.jpg?v=1777276731',
        },
      },
      {
        id: 'c6',
        name: 'Transparent Olive Green',
        hex: '#4D7C0F',
        images: {
          front: 'https://edgeopticals.com/cdn/shop/files/2_3e6f0fd5-2b3c-4360-ac02-d458502090fc.png?v=1775288035&width=940',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://edgeopticals.com/cdn/shop/files/2_3e6f0fd5-2b3c-4360-ac02-d458502090fc.png?v=1775288035&width=940',
        },
      },
      {
        id: 'c7',
        name: 'Transparent Grey',
        hex: '#64748B',
        images: {
          front: 'https://siddharthopticals.in/cdn/shop/files/0RX7027I__6749__P21__noshad__fr_grande.jpg?v=1777276731',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://siddharthopticals.in/cdn/shop/files/0RX7027I__6749__P21__noshad__fr_grande.jpg?v=1777276731',
        },
      },
      {
        id: 'c8',
        name: 'Grey Transparent with Green',
        hex: '#475569',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_1_1024x1024.jpg?v=1617353439',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_3_1024x1024.jpg?v=1617353439',
          angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Black_2_1024x1024.jpg?v=1617353439',
        },
      },
      {
        id: 'c9',
        name: 'Brown Transparent with Red',
        hex: '#991B1B',
        images: {
          front: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_1_1024x1024.jpg?v=1617353439',
          side: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_3_1024x1024.jpg?v=1617353439',
          angle: 'https://himalayaoptical.com/cdn/shop/products/Ray-Ban-7027I-Spectacle_Brown_2_1024x1024.jpg?v=1617353439',
        },
      },
    ],
    frameSpecifications: {
      shape: 'Rectangle',
      frameType: 'Full Rim',
      material: 'Nylon',
      size: 'Medium',
      weight: '16g',
    },
    lensCompatibility: {
      zeroPower: true,
      singleVision: true,
      progressive: true,
      blueLightBlock: true,
      sunTint: true,
    },
    eyeglassesConfig: {
      lensTypes: ['frame-only', 'single-vision', 'progressive'],
      prescriptionConfig: {
        allowManual: true,
        allowUpload: true,
        requireAddForProgressive: true,
      },
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
