import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import { createCoupon, deleteCoupon, getActiveCoupons, getAllCouponsAdmin, updateCoupon, validateCoupon } from '../controllers/couponController.js';

const router = express.Router();
router.get('/', getActiveCoupons);
router.post('/validate', validateCoupon);
router.get('/admin/all', protect, restrictTo('admin'), getAllCouponsAdmin);
router.post('/', protect, restrictTo('admin'), createCoupon);
router.put('/:id', protect, restrictTo('admin'), updateCoupon);
router.delete('/:id', protect, restrictTo('admin'), deleteCoupon);
export default router;
