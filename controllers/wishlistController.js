import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

/**
 * Format populated product item for wishlist response
 */
const formatWishlistItem = (item) => {
  const productObj = item.product.toObject ? item.product.toObject() : item.product;
  return {
    ...productObj,
    id: productObj._id,
    addedAt: item.addedAt,
    isInWishlist: true,
  };
};

/**
 * @desc    Get current user's wishlist
 * @route   GET /api/v1/wishlist
 * @access  Private
 */
export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: 'products.product',
    });

    if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: {
          wishlist: [],
          count: 0,
        },
      });
    }

    // Filter out any stale references where product was deleted from DB
    const validItems = wishlist.products.filter((item) => item.product !== null);

    // If stale items were pruned, persist cleanup in background
    if (validItems.length !== wishlist.products.length) {
      wishlist.products = validItems;
      await wishlist.save();
    }

    const formattedList = validItems.map(formatWishlistItem);

    return res.status(200).json({
      success: true,
      count: formattedList.length,
      data: {
        wishlist: formattedList,
        count: formattedList.length,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - getWishlist]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist',
      errorCode: 'WISHLIST_FETCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Add product to wishlist
 * @route   POST /api/v1/wishlist
 * @access  Private
 */
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
        errorCode: 'MISSING_PRODUCT_ID',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        errorCode: 'INVALID_PRODUCT_ID',
      });
    }

    const product = await Product.findById(productId);
    if (!product || product.status === 'archived') {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable',
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        products: [{ product: productId, addedAt: new Date() }],
      });
    } else {
      const alreadyInWishlist = wishlist.products.some(
        (item) => item.product.toString() === productId.toString()
      );

      if (alreadyInWishlist) {
        return res.status(200).json({
          success: true,
          message: 'Product is already in your wishlist',
          data: {
            productId,
            isInWishlist: true,
            count: wishlist.products.length,
          },
        });
      }

      wishlist.products.unshift({ product: productId, addedAt: new Date() });
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: 'Product added to wishlist successfully',
      data: {
        productId,
        isInWishlist: true,
        count: wishlist.products.length,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - addToWishlist]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add product to wishlist',
      errorCode: 'WISHLIST_ADD_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/v1/wishlist/:productId
 * @access  Private
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        errorCode: 'INVALID_PRODUCT_ID',
      });
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: 'Product removed from wishlist',
        data: {
          productId,
          isInWishlist: false,
          count: 0,
        },
      });
    }

    const initialCount = wishlist.products.length;
    wishlist.products = wishlist.products.filter(
      (item) => item.product.toString() !== productId.toString()
    );

    if (wishlist.products.length !== initialCount) {
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: {
        productId,
        isInWishlist: false,
        count: wishlist.products.length,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - removeFromWishlist]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove product from wishlist',
      errorCode: 'WISHLIST_REMOVE_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle product in wishlist (Add if not present, remove if present)
 * @route   POST /api/v1/wishlist/toggle
 * @access  Private
 */
export const toggleWishlist = async (req, res) => {
  try {
    const productId = req.body.productId || req.params.productId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
        errorCode: 'MISSING_PRODUCT_ID',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        errorCode: 'INVALID_PRODUCT_ID',
      });
    }

    const product = await Product.findById(productId);
    if (!product || product.status === 'archived') {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable',
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        products: [{ product: productId, addedAt: new Date() }],
      });
      await wishlist.save();

      return res.status(200).json({
        success: true,
        message: 'Product added to wishlist',
        data: {
          productId,
          isInWishlist: true,
          count: 1,
        },
      });
    }

    const existingIndex = wishlist.products.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    let isInWishlist;
    let message;

    if (existingIndex > -1) {
      // Remove from wishlist
      wishlist.products.splice(existingIndex, 1);
      isInWishlist = false;
      message = 'Product removed from wishlist';
    } else {
      // Add to wishlist
      wishlist.products.unshift({ product: productId, addedAt: new Date() });
      isInWishlist = true;
      message = 'Product added to wishlist';
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message,
      data: {
        productId,
        isInWishlist,
        count: wishlist.products.length,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - toggleWishlist]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle product in wishlist',
      errorCode: 'WISHLIST_TOGGLE_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Clear all items in user's wishlist
 * @route   DELETE /api/v1/wishlist
 * @access  Private
 */
export const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (wishlist) {
      wishlist.products = [];
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: {
        wishlist: [],
        count: 0,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - clearWishlist]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      errorCode: 'WISHLIST_CLEAR_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Check whether a specific product is in user's wishlist
 * @route   GET /api/v1/wishlist/check/:productId
 * @access  Private
 */
export const checkWishlistStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        errorCode: 'INVALID_PRODUCT_ID',
      });
    }

    const wishlist = await Wishlist.findOne({
      user: req.user._id,
      'products.product': productId,
    }).select('_id');

    const isInWishlist = Boolean(wishlist);

    return res.status(200).json({
      success: true,
      data: {
        productId,
        isInWishlist,
      },
    });
  } catch (error) {
    console.error('[Wishlist Controller - checkWishlistStatus]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status',
      errorCode: 'WISHLIST_CHECK_ERROR',
      error: error.message,
    });
  }
};
