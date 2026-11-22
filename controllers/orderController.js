import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      paymentStatus: { $ne: 'Failed' },
    })
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
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        { $match: { paymentStatus: 'Paid', orderStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    let query = Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.product', 'name slug images primaryImage price');

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
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

    if (previousStatus === status) {
      return res.status(200).json({ success: true, message: 'Order already has the requested status.', data: order });
    }

    if (previousStatus === 'Cancelled') {
      return res.status(409).json({ success: false, message: 'Cancelled orders cannot be reopened. Create a replacement order instead.', errorCode: 'CANCELLED_ORDER_TERMINAL' });
    }

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
