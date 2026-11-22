import mongoose from 'mongoose';

const shippingSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, immutable: true },
  freeShippingMinimum: { type: Number, default: 999, min: 0 },
  standardShippingFee: { type: Number, default: 99, min: 0 },
}, { timestamps: true });

const ShippingSettings = mongoose.model('ShippingSettings', shippingSettingsSchema);
export default ShippingSettings;
