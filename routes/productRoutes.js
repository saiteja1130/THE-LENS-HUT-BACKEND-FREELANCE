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
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ============================================
// Public Routes
// ============================================
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);

// ============================================
// Admin Routes (Admin-specific paths before /:idOrSlug)
// ============================================
router.get('/admin/all', getAllProductsAdmin);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/stock', updateProductStock);

// Public lookup by ID or slug (catch-all param at bottom)
router.get('/:idOrSlug', getProductByIdOrSlug);

export default router;
