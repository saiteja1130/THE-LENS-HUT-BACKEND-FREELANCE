import express from 'express';
import * as brandController from '../controllers/brandController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import { upload, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

const uploadBrandImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    next();
  });
};

// ==========================================
// PUBLIC ROUTES (Frontend & Mobile App)
// ==========================================
router.get('/', brandController.getActiveBrands);

// ==========================================
// ADMIN ROUTES (Protected / Admin Only)
// ==========================================
router.get('/admin/all', protect, restrictTo('admin'), brandController.getAllBrandsAdmin);
router.post('/', protect, restrictTo('admin'), uploadBrandImage, brandController.createBrand);
router.put('/admin/reorder', protect, restrictTo('admin'), brandController.reorderBrands);
router.put('/:id', protect, restrictTo('admin'), uploadBrandImage, brandController.updateBrand);
router.patch('/:id/toggle', protect, restrictTo('admin'), brandController.toggleBrand);
router.delete('/:id', protect, restrictTo('admin'), brandController.deleteBrand);

// Single brand lookup
router.get('/:idOrSlug', brandController.getBrandByIdOrSlug);

export default router;
