import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
    },
    headline: {
      type: String,
      trim: true,
      default: '',
    },
    kicker: {
      type: String,
      trim: true,
      default: '',
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    link: {
      type: String,
      default: '/shop',
      trim: true,
    },
    buttonText: {
      type: String,
      default: 'Shop Now',
      trim: true,
    },
    secondaryBtnText: {
      type: String,
      default: '',
      trim: true,
    },
    secondaryBtnLink: {
      type: String,
      default: '',
      trim: true,
    },
    bgColor: {
      type: String,
      default: '#FAF8F5',
      trim: true,
    },
    position: {
      type: String,
      enum: ['hero', 'promo', 'strip'],
      default: 'hero',
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    targetCategory: {
      type: String,
      default: 'Eyeglasses',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual id property
bannerSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

bannerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
