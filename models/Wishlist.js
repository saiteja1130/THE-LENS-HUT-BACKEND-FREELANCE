import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    products: [wishlistItemSchema],
  },
  {
    timestamps: true,
  }
);

// Index to quickly search if a user has a specific product in wishlist
wishlistSchema.index({ user: 1, 'products.product': 1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
