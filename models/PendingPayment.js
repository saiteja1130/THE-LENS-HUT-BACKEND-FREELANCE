import mongoose from 'mongoose';

const pendingPaymentSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    orderData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Auto-expire uncompleted pending payment sessions after 24 hours (86400 seconds)
      expires: 86400,
    },
  },
  {
    timestamps: true,
  }
);

const PendingPayment = mongoose.model('PendingPayment', pendingPaymentSchema);

export default PendingPayment;

