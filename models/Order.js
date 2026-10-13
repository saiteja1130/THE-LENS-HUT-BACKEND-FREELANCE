import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    productId: {
      type: String,
      default: '',
    },
    productType: {
      type: String,
      enum: ['eyeglasses', 'sunglasses', 'contact-lens', 'accessories'],
      default: 'eyeglasses',
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: 'The Lens Hut',
    },
    sku: {
      type: String,
      trim: true,
      default: 'LH-OPTICAL',
    },
    image: {
      type: String,
      default: '',
    },
    selectedColor: {
      type: String,
      default: 'Standard',
    },
    selectedSize: {
      type: String,
      default: 'Standard',
    },
    variantId: {
      type: String,
      default: 'default',
    },
    variantName: {
      type: String,
      default: 'Default',
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
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
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
    },
    locality: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const trackingSchema = new mongoose.Schema(
  {
    courierName: { type: String, default: 'Delhivery Express' },
    trackingId: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    estimatedDelivery: { type: String, default: 'Within 3–5 Business Days' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const opticalEyeSchema = new mongoose.Schema(
  {
    sph: { type: String, default: '0.00' },
    cyl: { type: String, default: '0.00' },
    axis: { type: String, default: '-' },
    add: { type: String, default: '' },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    hasPrescription: { type: Boolean, default: false },
    rightEye: { type: opticalEyeSchema, default: () => ({}) },
    leftEye: { type: opticalEyeSchema, default: () => ({}) },
    pd: { type: String, default: '63 mm' },
    lensPackage: { type: String, default: 'Optical Lab Custom Lens' },
    rxFile: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    billingAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Paid',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Processing',
      index: true,
    },
    status: {
      type: String,
      default: 'Placed',
    },
    tracking: {
      type: trackingSchema,
      default: () => ({}),
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    estimatedDelivery: {
      type: String,
      default: 'Within 3–5 Business Days',
    },
    prescription: {
      type: prescriptionSchema,
      default: () => ({ hasPrescription: false }),
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Provide compatibility aliases between frontend and admin panels
        if (ret.discountAmount === undefined) ret.discountAmount = ret.discount || 0;
        if (ret.shippingFee === undefined) ret.shippingFee = ret.shipping || 0;
        if (ret.totalAmount === undefined) ret.totalAmount = ret.total || 0;
        if (!ret.status) ret.status = ret.orderStatus || 'Placed';
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

// Virtual for item count summary text (e.g. "2 items")
orderSchema.virtual('itemCountText').get(function () {
  const count = this.items ? this.items.length : 0;
  return `${count} item${count === 1 ? '' : 's'}`;
});

// Sync aliases before save
orderSchema.pre('save', function (next) {
  if (this.discountAmount === undefined || this.discountAmount === 0) {
    this.discountAmount = this.discount || 0;
  }
  if (this.shippingFee === undefined || this.shippingFee === 0) {
    this.shippingFee = this.shipping || 0;
  }
  if (this.totalAmount === undefined || this.totalAmount === 0) {
    this.totalAmount = this.total || 0;
  }
  if (!this.trackingNumber && this.tracking?.trackingNumber) {
    this.trackingNumber = this.tracking.trackingNumber;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
