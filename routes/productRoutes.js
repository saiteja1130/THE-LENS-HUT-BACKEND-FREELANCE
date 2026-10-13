import express from 'express';
import {
  getProducts,
  getProductByIdOrSlug,
  getFeaturedProducts,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
} from '../controllers/productController.js';
import { protect, restrictTo, optionalAuth } from '../middlewares/auth.js';
import { uploadProductImages } from '../middlewares/upload.js';

const router = express.Router();

// ============================================
// Public / User Routes (with optional auth for wishlist detection)
// ============================================
router.get('/', optionalAuth, getProducts);
router.get('/featured', optionalAuth, getFeaturedProducts);

// ============================================
// Admin Routes (Admin-specific paths before /:idOrSlug)
// ============================================
router.get('/admin/all', protect, restrictTo('admin'), getAllProductsAdmin);
router.post('/', protect, restrictTo('admin'), uploadProductImages, createProduct);
router.put('/:id', protect, restrictTo('admin'), uploadProductImages, updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);
router.patch('/:id/stock', protect, restrictTo('admin'), updateProductStock);

// Public lookup by ID or slug (catch-all param at bottom)
router.get('/:idOrSlug', optionalAuth, getProductByIdOrSlug);

export default router;
