import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  updateOrderTrackingAdmin,
} from '../controllers/orderController.js';
import { protect, restrictTo, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Customer Endpoints
router.post('/', optionalAuth, createOrder);
router.get('/my-orders', protect, getMyOrders);

// Admin Management Endpoints (Requires admin role)
router.get('/admin/all', protect, restrictTo('admin'), getAllOrdersAdmin);
router.patch('/admin/:id/status', protect, restrictTo('admin'), updateOrderStatusAdmin);
router.patch('/admin/:id/tracking', protect, restrictTo('admin'), updateOrderTrackingAdmin);

// Order Details by ID / Order Number (must be after /admin and /my-orders to avoid matching :idOrOrderNumber)
router.get('/:idOrOrderNumber', optionalAuth, getOrderById);

export default router;
