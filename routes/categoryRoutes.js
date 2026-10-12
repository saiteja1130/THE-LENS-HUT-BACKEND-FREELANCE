import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (Frontend & Mobile App)
// ==========================================
router.get('/', categoryController.getActiveCategories);

// ==========================================
// ADMIN ROUTES (Protected / Admin Only)
// ==========================================
router.get('/admin/all', protect, restrictTo('admin'), categoryController.getAllCategoriesAdmin);
router.post('/', protect, restrictTo('admin'), categoryController.createCategory);
router.put('/admin/reorder', protect, restrictTo('admin'), categoryController.reorderCategories);
router.put('/:id', protect, restrictTo('admin'), categoryController.updateCategory);
router.patch('/:id/toggle', protect, restrictTo('admin'), categoryController.toggleCategory);
router.delete('/:id', protect, restrictTo('admin'), categoryController.deleteCategory);

// Single category lookup (after admin routes to avoid path collisions)
router.get('/:idOrSlug', categoryController.getCategoryByIdOrSlug);

export default router;
