import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    configurationHash: {
      type: String,
      required: [true, 'Configuration hash is required'],
      index: true,
    },
    variantId: {
      type: String,
      default: 'default',
    },
    variantName: {
      type: String,
      default: 'Default',
    },
    selectedColor: {
      type: String,
      default: 'Standard',
    },
    selectedSize: {
      type: String,
      default: 'Standard',
    },
    image: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

cartSchema.index({ user: 1, 'items.configurationHash': 1 });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
