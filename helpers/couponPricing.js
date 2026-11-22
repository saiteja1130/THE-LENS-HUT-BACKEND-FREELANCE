import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';
import { calculateConfiguredUnitPrice } from './productPricing.js';

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
};

export const couponIsInDateRange = (coupon, now = new Date()) => {
  const starts = new Date(coupon.startDate);
  starts.setUTCHours(0, 0, 0, 0);
  const expires = new Date(coupon.expiryDate);
  expires.setUTCHours(23, 59, 59, 999);
  return coupon.isActive && now >= starts && now <= expires;
};

export const calculateCouponDiscount = (coupon, items, subtotal) => {
  if (!coupon) return { success: true, discountAmount: 0 };
  if (!coupon.isActive) return { success: false, message: 'This coupon is inactive.' };
  if (!couponIsInDateRange(coupon)) {
    return { success: false, message: 'This coupon is outside its validity period.' };
  }
  if (subtotal < coupon.minOrderAmount) {
    return { success: false, message: `Add ${Math.ceil(coupon.minOrderAmount - subtotal)} more to use this coupon.` };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'Percentage') {
    discountAmount = subtotal * coupon.discountValue / 100;
    if (coupon.maxDiscount != null) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else if (coupon.discountType === 'Fixed Amount') {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === 'Buy One Get One') {
    const groups = new Map();
    for (const item of items) {
      const productId = String(item.productId || item.id || '');
      const configuration = JSON.stringify(stableValue(item.configuration || {}));
      const key = `${productId}:${configuration}`;
      const unitPrice = Number(item.unitPrice) || 0;
      const group = groups.get(key) || { quantity: 0, unitPrice };
      if (group.quantity > 0) group.unitPrice = Math.min(group.unitPrice, unitPrice);
      group.quantity += Number(item.quantity) || 0;
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      discountAmount += Math.floor(group.quantity / 2) * group.unitPrice;
    }
    if (!discountAmount) {
      return { success: false, message: 'Buy one more of the same product with the same options to use this coupon.' };
    }
  }

  discountAmount = Math.min(Math.round(discountAmount), subtotal);
  return {
    success: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount,
    message: coupon.discountType === 'Buy One Get One'
      ? `Buy One Get One applied. You save ₹${discountAmount}.`
      : `Coupon applied. You save ₹${discountAmount}.`,
  };
};

export const validateCouponForItems = async ({ code, items, subtotal }) => {
  const coupon = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() });
  if (!coupon) return { success: false, message: 'Coupon code is invalid.' };
  return calculateCouponDiscount(coupon, items, subtotal);
};

export const normalizeCouponItems = async (items) => {
  if (!Array.isArray(items) || !items.length) return { success: false, message: 'Add items to your cart first.' };
  let subtotal = 0;
  const pricedItems = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const productId = item.productId || item.id || item.product?._id || item.product;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !mongoose.Types.ObjectId.isValid(productId)) {
      return { success: false, message: 'Cart contains an invalid product or quantity.' };
    }
    const product = await Product.findOne({ _id: productId, status: 'active' });
    if (!product || product.stock < quantity) return { success: false, message: 'A product is unavailable or has insufficient stock.' };
    const unitPrice = calculateConfiguredUnitPrice(product, item.configuration || {});
    subtotal += unitPrice * quantity;
    pricedItems.push({ ...item, productId: product._id.toString(), id: product._id.toString(), name: product.name, quantity, unitPrice, price: unitPrice, totalPrice: unitPrice * quantity, configuration: item.configuration || {} });
  }
  return { success: true, subtotal, items: pricedItems };
};
