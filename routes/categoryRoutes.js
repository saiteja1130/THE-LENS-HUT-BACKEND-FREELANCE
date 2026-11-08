import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import { upload, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// Helper middleware for category single image
const uploadCatImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    next();
  });
};

// ==========================================
// PUBLIC ROUTES (Frontend & Mobile App)
// ==========================================
router.get('/', categoryController.getActiveCategories);

// ==========================================
// ADMIN ROUTES (Protected / Admin Only)
// ==========================================
router.get('/admin/all', protect, restrictTo('admin'), categoryController.getAllCategoriesAdmin);
router.post('/', protect, restrictTo('admin'), uploadCatImage, categoryController.createCategory);
router.put('/admin/reorder', protect, restrictTo('admin'), categoryController.reorderCategories);
router.put('/:id', protect, restrictTo('admin'), uploadCatImage, categoryController.updateCategory);
router.patch('/:id/toggle', protect, restrictTo('admin'), categoryController.toggleCategory);
router.delete('/:id', protect, restrictTo('admin'), categoryController.deleteCategory);

// Single category lookup (after admin routes to avoid path collisions)
router.get('/:idOrSlug', categoryController.getCategoryByIdOrSlug);

export default router;
