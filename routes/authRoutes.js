import express from 'express';
import * as authController from '../controllers/authController.js';
import validate from '../middlewares/validate.js';
import { protect } from '../middlewares/auth.js';
import {
  signupRules,
  verifyEmailRules,
  resendOTPRules,
  loginPasswordRules,
  requestLoginOTPRules,
  verifyLoginOTPRules,
} from '../helpers/validators.js';

const router = express.Router();

// Public auth endpoints
router.post('/signup', signupRules, validate, authController.signup);
router.post('/verify-email', verifyEmailRules, validate, authController.verifyEmail);
router.post('/resend-verification', resendOTPRules, validate, authController.resendVerification);

// Dual login endpoints
router.post('/login', loginPasswordRules, validate, authController.loginWithPassword);
router.post('/request-otp', requestLoginOTPRules, validate, authController.requestLoginOTP);
router.post('/verify-otp', verifyLoginOTPRules, validate, authController.verifyLoginOTP);

// Protected session check
router.get('/me', protect, authController.getMe);

export default router;
