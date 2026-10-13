import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { generateConfigurationHash } from '../helpers/hasher.js';

/**
 * Format populated cart for API response
 */
const formatCartResponse = (cart) => {
  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  const validItems = cart.items
    .filter((item) => item.product !== null)
    .map((item) => {
      const productObj = item.product.toObject ? item.product.toObject() : item.product;
      const availableStock = productObj?.stock !== undefined ? productObj.stock : 20;

      return {
        _id: item._id,
        key: item.configurationHash,
        configurationHash: item.configurationHash,
        productId: productObj?._id || item.product,
        product: productObj,
        variantId: item.variantId,
        variantName: item.variantName,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        image: item.image || productObj?.images?.front || productObj?.primaryImage || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        configuration: item.configuration,
        inStock: availableStock >= item.quantity,
        availableStock,
        addedAt: item.addedAt,
      };
    });

  const totalItems = validItems.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = validItems.reduce((acc, i) => acc + i.totalPrice, 0);

  return {
    items: validItems,
    totalItems,
    subtotal,
  };
};

/**
 * @desc    Get authenticated user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Clean up stale product items if product was deleted from DB
    const initialCount = cart.items.length;
    cart.items = cart.items.filter((item) => item.product !== null);
    if (cart.items.length !== initialCount) {
      await cart.save();
    }

    const formatted = formatCartResponse(cart);

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('[Cart Controller - getCart]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shopping bag',
      errorCode: 'CART_FETCH_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Add item or variant to cart
 * @route   POST /api/v1/cart
 * @access  Private
 */
export const addToCart = async (req, res) => {
  try {
    const {
      productId,
      configuration,
      quantity = 1,
      variantId,
      variantName,
      selectedColor,
      selectedSize,
      image,
      unitPrice,
    } = req.body;

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

    const availableStock = product.stock !== undefined ? product.stock : 20;
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    if (availableStock <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This product is currently out of stock',
        errorCode: 'OUT_OF_STOCK',
      });
    }

    // Resolve colorway and variant
    const resolvedColor =
      selectedColor ||
      variantName ||
      configuration?.variantName ||
      configuration?.frameColor ||
      product.colors?.[0]?.name ||
      'Standard';

    const resolvedVariantId =
      variantId ||
      configuration?.variantId ||
      `var-${product._id}-${resolvedColor.toLowerCase().replace(/\s+/g, '-')}`;

    // Resolve variant image
    const matchingColorObj = product.colors?.find(
      (c) => c.name.toLowerCase() === resolvedColor.toLowerCase()
    );
    const resolvedImage =
      image ||
      matchingColorObj?.images?.front ||
      matchingColorObj?.image ||
      product.images?.front ||
      product.primaryImage ||
      '';

    // Build configuration object
    const resolvedConfig = {
      productId: product._id.toString(),
      productType: product.productType || 'eyeglasses',
      variantId: resolvedVariantId,
      variantName: resolvedColor,
      ...configuration,
    };

    // Calculate deterministic configuration hash
    const configHash = generateConfigurationHash(product._id, resolvedConfig);

    // Resolve price
    const resolvedUnitPrice =
      typeof unitPrice === 'number' && unitPrice >= 0
        ? unitPrice
        : product.offerPrice || product.price;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if identical variant already exists in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.configurationHash === configHash
    );

    let wasUpdated = false;

    if (existingIndex > -1) {
      // Merge quantity for identical variant configuration
      const currentQty = cart.items[existingIndex].quantity;
      const combinedQty = Math.min(currentQty + qtyToAdd, availableStock);
      cart.items[existingIndex].quantity = combinedQty;
      cart.items[existingIndex].totalPrice = cart.items[existingIndex].unitPrice * combinedQty;
      wasUpdated = true;
    } else {
      // Create distinct variant item
      const initialQty = Math.min(qtyToAdd, availableStock);
      cart.items.unshift({
        product: product._id,
        configurationHash: configHash,
        variantId: resolvedVariantId,
        variantName: resolvedColor,
        selectedColor: resolvedColor,
        selectedSize: selectedSize || 'Standard',
        image: resolvedImage,
        quantity: initialQty,
        unitPrice: resolvedUnitPrice,
        totalPrice: resolvedUnitPrice * initialQty,
        configuration: resolvedConfig,
        addedAt: new Date(),
      });
    }

    await cart.save();
    await cart.populate({ path: 'items.product' });

    const formatted = formatCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: wasUpdated
        ? `Updated quantity for ${product.name} (${resolvedColor})`
        : `Added ${product.name} (${resolvedColor}) to your shopping bag`,
      data: formatted,
    });
  } catch (error) {
    console.error('[Cart Controller - addToCart]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to shopping bag',
      errorCode: 'CART_ADD_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Update item quantity in cart
 * @route   PUT /api/v1/cart/:itemKey
 * @access  Private
 */
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { itemKey } = req.params;
    const { quantity } = req.body;

    const newQty = parseInt(quantity, 10);
    if (isNaN(newQty)) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity number is required',
        errorCode: 'INVALID_QUANTITY',
      });
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Shopping bag not found',
        errorCode: 'CART_NOT_FOUND',
      });
    }

    const itemIndex = cart.items.findIndex(
      (i) => i.configurationHash === itemKey || i._id.toString() === itemKey
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in shopping bag',
        errorCode: 'ITEM_NOT_FOUND',
      });
    }

    if (newQty <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      const product = cart.items[itemIndex].product;
      const maxStock = product?.stock !== undefined ? product.stock : 20;
      const cappedQty = Math.min(newQty, maxStock);

      cart.items[itemIndex].quantity = cappedQty;
      cart.items[itemIndex].totalPrice = cart.items[itemIndex].unitPrice * cappedQty;
    }

    await cart.save();
    const formatted = formatCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: 'Shopping bag updated',
      data: formatted,
    });
  } catch (error) {
    console.error('[Cart Controller - updateCartItemQuantity]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update quantity',
      errorCode: 'CART_UPDATE_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove an item or variant card from cart
 * @route   DELETE /api/v1/cart/:itemKey
 * @access  Private
 */
export const removeCartItem = async (req, res) => {
  try {
    const { itemKey } = req.params;

    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'Item removed',
        data: { items: [], totalItems: 0, subtotal: 0 },
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (i) => i.configurationHash !== itemKey && i._id.toString() !== itemKey
    );

    if (cart.items.length !== initialLength) {
      await cart.save();
    }

    const formatted = formatCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: 'Item removed from shopping bag',
      data: formatted,
    });
  } catch (error) {
    console.error('[Cart Controller - removeCartItem]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item from shopping bag',
      errorCode: 'CART_REMOVE_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Clear all items in cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Shopping bag cleared successfully',
      data: {
        items: [],
        totalItems: 0,
        subtotal: 0,
      },
    });
  } catch (error) {
    console.error('[Cart Controller - clearCart]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear shopping bag',
      errorCode: 'CART_CLEAR_ERROR',
      error: error.message,
    });
  }
};

/**
 * @desc    Sync / merge guest cart items into account cart
 * @route   POST /api/v1/cart/sync
 * @access  Private
 */
export const syncCart = async (req, res) => {
  try {
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return getCart(req, res);
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const guestItem of items) {
      const pid = guestItem.productId || guestItem.id || guestItem.product?._id || guestItem.product?.id;
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) continue;

      const product = await Product.findById(pid);
      if (!product || product.status === 'archived') continue;

      const availableStock = product.stock !== undefined ? product.stock : 20;
      const configHash = guestItem.configurationHash || guestItem.key;
      if (!configHash) continue;

      const existingIndex = cart.items.findIndex(
        (i) => i.configurationHash === configHash
      );

      const qty = Math.max(1, guestItem.quantity || 1);

      if (existingIndex > -1) {
        const combined = Math.min(cart.items[existingIndex].quantity + qty, availableStock);
        cart.items[existingIndex].quantity = combined;
        cart.items[existingIndex].totalPrice = cart.items[existingIndex].unitPrice * combined;
      } else {
        cart.items.push({
          product: product._id,
          configurationHash: configHash,
          variantId: guestItem.variantId || 'default',
          variantName: guestItem.variantName || guestItem.frameColor || 'Default',
          selectedColor: guestItem.selectedColor || guestItem.frameColor || 'Standard',
          selectedSize: guestItem.selectedSize || 'Standard',
          image: guestItem.image || product.images?.front || '',
          quantity: Math.min(qty, availableStock),
          unitPrice: guestItem.unitPrice || product.offerPrice || product.price,
          totalPrice: (guestItem.unitPrice || product.offerPrice || product.price) * Math.min(qty, availableStock),
          configuration: guestItem.configuration || {},
          addedAt: new Date(),
        });
      }
    }

    await cart.save();
    await cart.populate({ path: 'items.product' });

    const formatted = formatCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: 'Shopping bag synchronized successfully',
      data: formatted,
    });
  } catch (error) {
    console.error('[Cart Controller - syncCart]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize shopping bag',
      errorCode: 'CART_SYNC_ERROR',
      error: error.message,
    });
  }
};
