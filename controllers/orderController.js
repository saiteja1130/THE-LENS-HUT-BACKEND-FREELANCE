import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import { sendOrderConfirmationEmail } from '../helpers/mailer.js';

/**
 * Generate a cryptographically strong unique order number formatted as LH-XXXXXXXX
 */
const generateUniqueOrderNumber = async () => {
  let isUnique = false;
  let orderNumber = '';

  while (!isUnique) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    orderNumber = `LH-${randomHex}`;
    const existing = await Order.findOne({ orderNumber });
    if (!existing) {
      isUnique = true;
    }
  }

  return orderNumber;
};

/**
 * Generate tracking number e.g. LH-EXP-XXXXXX
 */
const generateTrackingNumber = () => {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `LH-EXP-${randomDigits}`;
};

/**
 * Extract or normalize prescription from order payload
 */
const extractPrescriptionData = (payloadPrescription, items) => {
  if (payloadPrescription && payloadPrescription.hasPrescription) {
    return payloadPrescription;
  }

  // Check if any eyeglasses item has an attached prescription in configuration
  const rxItem = items.find(
    (i) => i.configuration?.prescription?.od?.sph || i.configuration?.prescription?.hasPrescription
  );

  if (rxItem?.configuration?.prescription) {
    const rx = rxItem.configuration.prescription;
    return {
      hasPrescription: true,
      rightEye: {
        sph: rx.od?.sph || rx.rightEye?.sph || '0.00',
        cyl: rx.od?.cyl || rx.rightEye?.cyl || '0.00',
        axis: rx.od?.axis || rx.rightEye?.axis || '-',
        add: rx.od?.add || rx.rightEye?.add || '',
      },
      leftEye: {
        sph: rx.os?.sph || rx.leftEye?.sph || '0.00',
        cyl: rx.os?.cyl || rx.leftEye?.cyl || '0.00',
        axis: rx.os?.axis || rx.leftEye?.axis || '-',
        add: rx.os?.add || rx.leftEye?.add || '',
      },
      pd: rx.pd ? `${rx.pd} mm` : '63 mm',
      lensPackage:
        rxItem.configuration?.lensSelection?.lensName ||
        rx.lensPackage ||
        'Optical Lab Custom Lens',
      rxFile: rx.rxFile || '',
    };
  }

  return {
    hasPrescription: false,
    rightEye: { sph: '0.00', cyl: '0.00', axis: '-' },
    leftEye: { sph: '0.00', cyl: '0.00', axis: '-' },
    pd: '63 mm',
    lensPackage: 'Standard',
    rxFile: '',
  };
};

/**
 * @desc    Create a new order (Authenticated user or Guest checkout)
 * @route   POST /api/v1/orders
 * @access  Public (supports optionalAuth)
 */
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      customer: customerInput,
      subtotal,
      discount,
      discountAmount,
      couponCode,
      shipping,
      shippingFee,
      total,
      totalAmount,
      paymentMethod,
      paymentStatus,
      prescription,
      notes,
    } = req.body;

    // 1. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
        errorCode: 'INVALID_ORDER_ITEMS',
      });
    }

    // 2. Validate shipping address
    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.street ||
      !shippingAddress.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address (Full Name, Phone, Street, Pincode) is required.',
        errorCode: 'MISSING_SHIPPING_ADDRESS',
      });
    }

    // 3. Assemble Customer Information
    const customer = {
      id: req.user ? req.user._id.toString() : customerInput?.id || 'cust-guest',
      name:
        customerInput?.name ||
        req.body.customerName ||
        req.user?.fullName ||
        shippingAddress.fullName ||
        'Valued Customer',
      email:
        customerInput?.email ||
        req.body.customerEmail ||
        req.user?.email ||
        'customer@thelenshut.com',
      phone:
        customerInput?.phone ||
        req.body.customerPhone ||
        req.user?.phone ||
        shippingAddress.phone ||
        '',
    };

    // 4. Validate stock & prepare line items with authoritative server-side pricing
    const preparedItems = [];
    const stockUpdates = [];

    for (const rawItem of items) {
      const quantity = Math.max(1, Number(rawItem.quantity) || 1);

      const targetId =
        rawItem.productId ||
        rawItem.id ||
        (rawItem.product?._id ? rawItem.product._id.toString() : rawItem.product);

      if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID supplied in order items.',
          errorCode: 'INVALID_PRODUCT_ID',
        });
      }

      const productDoc = await Product.findById(targetId);
      if (!productDoc || productDoc.status === 'archived') {
        return res.status(400).json({
          success: false,
          message: `Product "${rawItem.name || targetId}" is not available or does not exist.`,
          errorCode: 'PRODUCT_NOT_AVAILABLE',
        });
      }

      // Validate inventory availability
      if (productDoc.stock !== undefined && productDoc.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity for "${productDoc.name}" exceeds available stock (${productDoc.stock} in stock).`,
          errorCode: 'INSUFFICIENT_STOCK',
          data: {
            productId: productDoc._id,
            requested: quantity,
            available: productDoc.stock,
          },
        });
      }

      // Calculate authoritative server unit price from database product model
      const unitBasePrice =
        typeof productDoc.offerPrice === 'number' && productDoc.offerPrice > 0
          ? productDoc.offerPrice
          : (productDoc.price || 0);

      // Validate optical lens package addon if configured
      let lensAddonPrice = 0;
      const lensId = rawItem.configuration?.lensSelection?.lensId;
      if (lensId && Array.isArray(productDoc.eyeglassesConfig?.availableLenses)) {
        const matchedLens = productDoc.eyeglassesConfig.availableLenses.find((l) => l.id === lensId);
        if (matchedLens && typeof matchedLens.price === 'number') {
          lensAddonPrice = matchedLens.price;
        }
      }
      if (lensAddonPrice === 0 && rawItem.configuration?.lensSelection?.lensPrice) {
        lensAddonPrice = Math.max(0, Number(rawItem.configuration.lensSelection.lensPrice) || 0);
      }

      const verifiedUnitPrice = unitBasePrice + lensAddonPrice;
      const verifiedTotalPrice = verifiedUnitPrice * quantity;

      stockUpdates.push({
        productId: productDoc._id,
        decrementBy: quantity,
      });

      preparedItems.push({
        product: productDoc._id,
        productId: productDoc._id.toString(),
        productType: rawItem.productType || rawItem.configuration?.productType || productDoc.productType || 'eyeglasses',
        name: productDoc.name,
        brand: productDoc.brand || rawItem.brand || 'The Lens Hut',
        sku: productDoc.sku || rawItem.sku || 'LH-OPTICAL',
        image: rawItem.image || productDoc.images?.front || productDoc.primaryImage || '',
        selectedColor: rawItem.selectedColor || rawItem.variantName || 'Standard',
        selectedSize: rawItem.selectedSize || 'Standard',
        variantId: rawItem.variantId || 'default',
        variantName: rawItem.variantName || 'Default',
        quantity,
        unitPrice: verifiedUnitPrice,
        totalPrice: verifiedTotalPrice,
        configuration: rawItem.configuration || {},
      });
    }

    // 5. Generate order identifiers & authoritative financial totals
    const orderNumber = await generateUniqueOrderNumber();
    const trackingNumber = generateTrackingNumber();

    const calcSubtotal = preparedItems.reduce((acc, i) => acc + i.totalPrice, 0);

    // Calculate shipping safely based on cart subtotal & delivery tier
    const isExpress =
      req.body.shippingMethod === 'express' ||
      Number(shippingFee) === 149 ||
      Number(shipping) === 149;
    const calcShipping = isExpress ? 149 : (calcSubtotal >= 999 ? 0 : 99);

    // Validate discounts strictly (cannot be negative and cannot exceed subtotal)
    const rawDiscount = Math.max(0, Number(discountAmount !== undefined ? discountAmount : discount) || 0);
    const calcDiscount = Math.min(calcSubtotal, rawDiscount);

    // Calculate authoritative total
    const calcTotal = Math.max(0, calcSubtotal - calcDiscount + calcShipping);

    // Initial payment status is always Pending on checkout; client cannot force 'Paid' status
    const initialPaymentStatus = 'Pending';

    const prescriptionData = extractPrescriptionData(prescription, preparedItems);

    // 6. Create Order document
    const newOrder = new Order({
      orderNumber,
      user: req.user ? req.user._id : null,
      customer,
      items: preparedItems,
      shippingAddress: {
        id: shippingAddress.id || 'addr-' + Date.now(),
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        street: shippingAddress.street.trim(),
        locality: (shippingAddress.locality || '').trim(),
        city: (shippingAddress.city || 'City').trim(),
        state: (shippingAddress.state || 'State').trim(),
        pincode: shippingAddress.pincode.trim(),
        isDefault: shippingAddress.isDefault !== undefined ? shippingAddress.isDefault : true,
      },
      billingAddress: billingAddress || null,
      subtotal: calcSubtotal,
      discount: calcDiscount,
      discountAmount: calcDiscount,
      couponCode: (couponCode || '').trim().toUpperCase(),
      shipping: calcShipping,
      shippingFee: calcShipping,
      total: calcTotal,
      totalAmount: calcTotal,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      paymentStatus: initialPaymentStatus,
      orderStatus: 'Processing',
      status: 'Placed',
      tracking: {
        courierName: 'Delhivery Express',
        trackingId: trackingNumber,
        trackingNumber: trackingNumber,
        estimatedDelivery: 'Within 3–5 Business Days',
        updatedAt: new Date(),
      },
      trackingNumber,
      estimatedDelivery: 'Within 3–5 Business Days',
      prescription: prescriptionData,
      notes: notes || '',
      orderDate: new Date(),
    });

    // 7. Deduct inventory stock atomically with rollback guarantee
    const appliedStockUpdates = [];
    let savedOrder;

    try {
      for (const update of stockUpdates) {
        const updatedDoc = await Product.findOneAndUpdate(
          { _id: update.productId, stock: { $gte: update.decrementBy } },
          { $inc: { stock: -update.decrementBy } },
          { new: true }
        );

        if (!updatedDoc) {
          throw new Error(`INSUFFICIENT_STOCK_${update.productId}`);
        }

        appliedStockUpdates.push(update);
      }

      savedOrder = await newOrder.save();
    } catch (saveOrStockErr) {
      // Rollback any deducted stock in reverse
      for (const rollback of appliedStockUpdates) {
        await Product.findByIdAndUpdate(rollback.productId, {
          $inc: { stock: rollback.decrementBy },
        }).catch((rbErr) => {
          console.error('[Order Controller] Rollback error for product:', rollback.productId, rbErr);
        });
      }

      if (saveOrStockErr.message && saveOrStockErr.message.startsWith('INSUFFICIENT_STOCK_')) {
        return res.status(400).json({
          success: false,
          message: 'One or more items in your cart became unavailable during checkout. Please review inventory.',
          errorCode: 'INSUFFICIENT_STOCK',
        });
      }

      throw saveOrStockErr;
    }

    // 8. If authenticated user, clear their backend shopping bag
    if (req.user) {
      try {
        await Cart.findOneAndUpdate(
          { user: req.user._id },
          { $set: { items: [] } }
        );
      } catch (cartErr) {
        console.warn('[Order Controller] Cart clearance warning:', cartErr.message);
      }
    }

    // 9. Asynchronously dispatch order confirmation email
    if (customer.email && customer.email.includes('@')) {
      sendOrderConfirmationEmail(customer.email, savedOrder, customer.name).catch((mailErr) => {
        console.error('[Order Controller] Async email dispatch error:', mailErr.message);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully and confirmed',
      data: savedOrder,
    });
  } catch (error) {
    console.error('[Order Controller - createOrder]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      errorCode: 'ORDER_CREATION_FAILED',
      error: error.message,
    });
  }
};

/**
 * @desc    Get order history for authenticated user
 * @route   GET /api/v1/orders/my-orders
 * @access  Private (protect)
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name slug images primaryImage price offerPrice');

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('[Order Controller - getMyOrders]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order history',
      errorCode: 'FETCH_MY_ORDERS_FAILED',
      error: error.message,
    });
  }
};

/**
 * @desc    Get order by MongoDB ObjectId or orderNumber
 * @route   GET /api/v1/orders/:idOrOrderNumber
 * @access  Public / Optional Auth
 */
export const getOrderById = async (req, res) => {
  try {
    const { idOrOrderNumber } = req.params;

    if (!idOrOrderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order identifier is required',
        errorCode: 'MISSING_ORDER_ID',
      });
    }

    const query = mongoose.Types.ObjectId.isValid(idOrOrderNumber)
      ? { $or: [{ _id: idOrOrderNumber }, { orderNumber: idOrOrderNumber.toUpperCase() }] }
      : { orderNumber: idOrOrderNumber.toUpperCase() };

    const order = await Order.findOne(query).populate(
      'items.product',
      'name slug images primaryImage price offerPrice'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order "${idOrOrderNumber}" not found`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    // Authorization & Ownership Verification:
    // 1. Admin has global visibility
    const isAdmin = req.user && req.user.role === 'admin';

    // 2. Authenticated user who created the order
    const isOwner =
      req.user &&
      order.user &&
      order.user.toString() === req.user._id.toString();

    // 3. Authenticated user whose email matches the order customer
    const isEmailOwner =
      req.user &&
      req.user.email &&
      order.customer?.email &&
      req.user.email.toLowerCase() === order.customer.email.toLowerCase();

    // 4. Guest verification via matching email or phone
    const queryEmail = (req.query.email || req.headers['x-order-email'] || '').trim().toLowerCase();
    const queryPhone = (req.query.phone || req.headers['x-order-phone'] || '').trim().replace(/\D/g, '');
    const orderEmail = (order.customer?.email || '').trim().toLowerCase();
    const orderPhone = (order.customer?.phone || '').trim().replace(/\D/g, '');

    const isVerifiedEmail = Boolean(queryEmail && orderEmail && queryEmail === orderEmail);
    const isVerifiedPhone = Boolean(queryPhone && orderPhone && queryPhone.length >= 6 && (orderPhone.endsWith(queryPhone) || queryPhone.endsWith(orderPhone)));
    const isGuestVerified = isVerifiedEmail || isVerifiedPhone;

    const isAuthorized = isAdmin || isOwner || isEmailOwner || isGuestVerified;

    if (!isAuthorized) {
      // If caller is authenticated user attempting to view someone else's order
      if (req.user && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order',
          errorCode: 'FORBIDDEN_ORDER_ACCESS',
        });
      }

      // If public unauthenticated tracking query, return sanitized tracking data without exposing customer PII or prescription
      if (req.query.trackingOnly === 'true' || req.query.mode === 'track') {
        return res.status(200).json({
          success: true,
          isRedacted: true,
          data: {
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            status: order.status,
            tracking: order.tracking,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery,
            createdAt: order.createdAt,
            orderDate: order.orderDate,
            total: order.total,
            totalAmount: order.totalAmount,
            itemCount: order.items?.length || 0,
            items: order.items?.map((i) => ({
              name: i.name,
              image: i.image,
              quantity: i.quantity,
              productType: i.productType,
              brand: i.brand,
            })),
            shippingDestination: {
              city: order.shippingAddress?.city,
              state: order.shippingAddress?.state,
            },
          },
        });
      }

      // Block unauthenticated exposure of customer address, phone, email, and prescription details
      return res.status(403).json({
        success: false,
        message: 'Verification required: please provide the customer email or phone number associated with this order to view full order details.',
        errorCode: 'ORDER_VERIFICATION_REQUIRED',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('[Order Controller - getOrderById]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      errorCode: 'FETCH_ORDER_FAILED',
      error: error.message,
    });
  }
};

/**
 * @desc    Admin: Get all orders with search, filter, and pagination
 * @route   GET /api/v1/orders/admin/all
 * @access  Private / Admin
 */
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;

    const filter = {};

    if (status && status !== 'All') {
      filter.orderStatus = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { 'customer.name': { $regex: q, $options: 'i' } },
        { 'customer.phone': { $regex: q, $options: 'i' } },
        { 'customer.email': { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
      ];
    }

    // Overall summary statistics
    const [
      totalOrders,
      pendingCount,
      processingCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
      revenueResult,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'Pending' }),
      Order.countDocuments({ orderStatus: 'Processing' }),
      Order.countDocuments({ orderStatus: 'Shipped' }),
      Order.countDocuments({ orderStatus: 'Delivered' }),
      Order.countDocuments({ orderStatus: 'Cancelled' }),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    let query = Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.product', 'name slug images primaryImage price');

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));
      query = query.skip((p - 1) * l).limit(l);
    }

    const orders = await query;
    const filteredCount = await Order.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: orders.length,
      totalCount: filteredCount,
      data: orders,
      stats: {
        totalOrders,
        totalRevenue,
        pendingCount,
        processingCount,
        shippedCount,
        deliveredCount,
        cancelledCount,
      },
    });
  } catch (error) {
    console.error('[Order Controller - getAllOrdersAdmin]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin order list',
      errorCode: 'ADMIN_FETCH_ORDERS_FAILED',
      error: error.message,
    });
  }
};

/**
 * @desc    Admin: Update order fulfillment status (with inventory restoration on Cancelled)
 * @route   PATCH /api/v1/orders/admin/:id/status
 * @access  Private / Admin
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        errorCode: 'INVALID_ORDER_STATUS',
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { orderNumber: id.toUpperCase() }] }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order "${id}" not found`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const previousStatus = order.orderStatus;

    // Automated Stock Restoration on Cancellation
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        } else if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    } else if (previousStatus === 'Cancelled' && status !== 'Cancelled') {
      // Re-deduct stock if un-cancelling
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        } else if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity },
          });
        }
      }
    }

    order.orderStatus = status;
    order.status = status;

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status successfully updated to ${status}`,
      data: order,
    });
  } catch (error) {
    console.error('[Order Controller - updateOrderStatusAdmin]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      errorCode: 'UPDATE_ORDER_STATUS_FAILED',
      error: error.message,
    });
  }
};

/**
 * @desc    Admin: Update courier tracking details
 * @route   PATCH /api/v1/orders/admin/:id/tracking
 * @access  Private / Admin
 */
export const updateOrderTrackingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { courierName, trackingId, trackingNumber, estimatedDelivery } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { orderNumber: id.toUpperCase() }] }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order "${id}" not found`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const finalTrackingNumber = trackingNumber || trackingId || order.trackingNumber || '';

    order.tracking = {
      courierName: courierName || order.tracking?.courierName || 'Delhivery Express',
      trackingId: finalTrackingNumber,
      trackingNumber: finalTrackingNumber,
      estimatedDelivery:
        estimatedDelivery ||
        order.tracking?.estimatedDelivery ||
        'Within 3–5 Business Days',
      updatedAt: new Date(),
    };

    order.trackingNumber = finalTrackingNumber;
    if (estimatedDelivery) {
      order.estimatedDelivery = estimatedDelivery;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Courier tracking information updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Order Controller - updateOrderTrackingAdmin]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update courier tracking',
      errorCode: 'UPDATE_TRACKING_FAILED',
      error: error.message,
    });
  }
};
