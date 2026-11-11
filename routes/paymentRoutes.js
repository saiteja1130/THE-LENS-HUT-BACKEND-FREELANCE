import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} from '../controllers/paymentController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Order creation endpoint: validates amount >= 100 paise, stages pending payment, returns { order_id, amount, currency }
router.post('/create-order', optionalAuth, createRazorpayOrder);

// Signature verification endpoint: validates HMAC-SHA256 signature and finalizes order into database
router.post('/verify-payment', optionalAuth, verifyRazorpayPayment);

// Webhook endpoint: handles background order finalization for user drop-off / closed tab
router.post('/webhook', handleRazorpayWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);

export default router;

