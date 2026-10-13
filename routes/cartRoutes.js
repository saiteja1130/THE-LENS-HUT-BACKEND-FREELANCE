import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  syncCart,
} from '../controllers/cartController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All cart operations require user authentication
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/sync', syncCart);
router.put('/:itemKey', updateCartItemQuantity);
router.delete('/:itemKey', removeCartItem);
router.delete('/', clearCart);

export default router;
