import express from 'express';
import { readShippingSettings, saveShippingSettings } from '../controllers/shippingSettingsController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

router.get('/shipping', readShippingSettings);
router.put('/shipping', protect, restrictTo('admin'), saveShippingSettings);

export default router;
