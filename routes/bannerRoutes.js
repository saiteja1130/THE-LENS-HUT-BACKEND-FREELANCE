import express from 'express';
import * as bannerController from '../controllers/bannerController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (Frontend & Mobile App)
// ==========================================
router.get('/', bannerController.getActiveBanners);

// ==========================================
// ADMIN ROUTES (Protected / Admin Only)
// ==========================================
router.get('/admin/all', protect, restrictTo('admin'), bannerController.getAllBannersAdmin);
router.post('/', protect, restrictTo('admin'), bannerController.createBanner);
router.put('/admin/reorder', protect, restrictTo('admin'), bannerController.reorderBanners);
router.put('/:id', protect, restrictTo('admin'), bannerController.updateBanner);
router.patch('/:id/toggle', protect, restrictTo('admin'), bannerController.toggleBanner);
router.delete('/:id', protect, restrictTo('admin'), bannerController.deleteBanner);

// Single banner lookup (after admin routes to prevent param collisions)
router.get('/:id', bannerController.getBannerById);

export default router;
