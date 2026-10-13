import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
  checkWishlistStatus,
} from '../controllers/wishlistController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All wishlist operations require an authenticated user
router.use(protect);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.post('/toggle', toggleWishlist);
router.delete('/:productId', removeFromWishlist);
router.delete('/', clearWishlist);
router.get('/check/:productId', checkWishlistStatus);

export default router;
