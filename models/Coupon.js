import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
  discountType: { type: String, enum: ['Fixed Amount', 'Percentage', 'Buy One Get One'], required: true },
  discountValue: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: null, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

couponSchema.pre('validate', function validateCoupon() {
  if (this.code) this.code = this.code.trim().toUpperCase();
  if (this.startDate && this.expiryDate && this.expiryDate < this.startDate) {
    this.invalidate('expiryDate', 'Expiry date cannot be before start date');
  }
  if (this.discountType === 'Percentage' && (this.discountValue <= 0 || this.discountValue > 100)) {
    this.invalidate('discountValue', 'Percentage must be between 1 and 100');
  }
  if (this.discountType === 'Fixed Amount' && this.discountValue <= 0) {
    this.invalidate('discountValue', 'Discount amount must be greater than zero');
  }
});

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
