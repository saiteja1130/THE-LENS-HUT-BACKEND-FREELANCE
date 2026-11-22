import Coupon from '../models/Coupon.js';
import { calculateCouponDiscount, couponIsInDateRange, normalizeCouponItems } from '../helpers/couponPricing.js';

const respond = (res, status, success, data, message) => res.status(status).json({ success, ...(data !== undefined ? { data } : {}), ...(message ? { message } : {}) });

export const getActiveCoupons = async (req, res) => {
  try {
    const candidates = await Coupon.find({ isActive: true, startDate: { $lte: new Date() } })
      .select('code discountType discountValue maxDiscount minOrderAmount startDate expiryDate isActive')
      .sort({ createdAt: -1 });
    const coupons = candidates.filter((coupon) => couponIsInDateRange(coupon));
    return respond(res, 200, true, coupons);
  } catch (error) {
    return respond(res, 500, false, undefined, error.message || 'Failed to load coupons.');
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const normalized = await normalizeCouponItems(req.body.items);
    if (!normalized.success) return respond(res, 400, false, undefined, normalized.message);
    const coupon = await Coupon.findOne({ code: String(req.body.code || '').trim().toUpperCase() });
    if (!coupon) return respond(res, 400, false, undefined, 'Coupon code is invalid.');
    const result = calculateCouponDiscount(coupon, normalized.items, normalized.subtotal);
    if (!result.success) return respond(res, 400, false, undefined, result.message);
    return respond(res, 200, true, { ...result, subtotal: normalized.subtotal });
  } catch (error) {
    return respond(res, 500, false, undefined, error.message || 'Could not validate this coupon.');
  }
};

export const getAllCouponsAdmin = async (req, res) => {
  try {
    return respond(res, 200, true, await Coupon.find().sort({ createdAt: -1 }));
  } catch (error) {
    return respond(res, 500, false, undefined, error.message || 'Failed to load coupons.');
  }
};

export const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    return respond(res, 201, true, coupon);
  } catch (error) {
    return respond(res, error.code === 11000 ? 409 : 400, false, undefined, error.code === 11000 ? 'A coupon with this code already exists.' : error.message);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return respond(res, 404, false, undefined, 'Coupon not found.');
    return respond(res, 200, true, coupon);
  } catch (error) {
    return respond(res, error.code === 11000 ? 409 : 400, false, undefined, error.code === 11000 ? 'A coupon with this code already exists.' : error.message);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return respond(res, 404, false, undefined, 'Coupon not found.');
    return respond(res, 200, true, { id: coupon.id });
  } catch (error) {
    return respond(res, 500, false, undefined, error.message || 'Failed to delete coupon.');
  }
};
