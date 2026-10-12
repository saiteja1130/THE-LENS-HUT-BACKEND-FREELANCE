import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// ==========================================
// USER ROUTES (User can only access own data)
// ==========================================
router.get('/profile', protect, userController.getMyProfile);
router.put('/profile', protect, userController.updateMyProfile);

// ==========================================
// ADMIN ROUTES (Admin has all visibility)
// ==========================================
router.get('/admin/users', protect, restrictTo('admin'), userController.getAllUsers);
router.get('/admin/users/:id', protect, restrictTo('admin'), userController.getUserById);
router.patch('/admin/users/:id/role', protect, restrictTo('admin'), userController.updateUserRole);
router.get('/admin/dashboard-stats', protect, restrictTo('admin'), userController.getAdminStats);

export default router;
