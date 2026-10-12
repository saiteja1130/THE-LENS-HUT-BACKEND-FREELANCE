import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [160, 'Product name cannot exceed 160 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: 'The Lens Hut Reserve',
    },
    category: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    productType: {
      type: String,
      enum: ['eyeglasses', 'sunglasses', 'contact-lens', 'accessories'],
      default: 'eyeglasses',
      index: true,
    },
    gender: {
      type: String,
      enum: ['Men', 'Women', 'Unisex', 'Kids', 'All'],
      default: 'Unisex',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    mrp: {
      type: Number,
      min: [0, 'MRP must be greater than or equal to 0'],
      default: 0,
    },
    offerPrice: {
      type: Number,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stock: {
      type: Number,
      required: true,
      default: 20,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 120,
      min: 0,
    },
    images: {
      front: { type: String, default: '' },
      side: { type: String, default: '' },
      angle: { type: String, default: '' },
    },
    colors: [
      {
        id: { type: String },
        name: { type: String, required: true },
        hex: { type: String, default: '#111827' },
        images: {
          front: { type: String, default: '' },
          side: { type: String, default: '' },
          angle: { type: String, default: '' },
        },
      },
    ],
    frameSpecifications: {
      shape: { type: String, default: 'Round' },
      frameType: { type: String, default: 'Full Rim' },
      material: { type: String, default: 'Acetate' },
      size: { type: String, default: 'Medium' },
      weight: { type: String, default: '18g' },
    },
    lensCompatibility: {
      zeroPower: { type: Boolean, default: true },
      singleVision: { type: Boolean, default: true },
      progressive: { type: Boolean, default: true },
      blueLightBlock: { type: Boolean, default: true },
      sunTint: { type: Boolean, default: true },
    },
    eyeglassesConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    contactLensConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    sunglassesConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save calculate discountPercent and auto offerPrice
productSchema.pre('save', function (next) {
  if (this.mrp && this.mrp > this.price) {
    this.discountPercent = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  } else {
    this.discountPercent = 0;
  }
  if (!this.offerPrice) {
    this.offerPrice = this.price;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
