import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import { sendOrderConfirmationEmail } from '../helpers/mailer.js';

/**
 * Generate a unique order number formatted as LH-XXXXXX
 */
const generateUniqueOrderNumber = async () => {
  let isUnique = false;
  let orderNumber = '';

  while (!isUnique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    orderNumber = `LH-${randomDigits}`;
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

    // 4. Validate stock & prepare line items
    const preparedItems = [];
    const stockUpdates = [];

    for (const rawItem of items) {
      const quantity = Math.max(1, Number(rawItem.quantity) || 1);
      const unitPrice = Number(rawItem.unitPrice) || 0;
      const itemTotalPrice = Number(rawItem.totalPrice) || unitPrice * quantity;

      let productRef = null;
      let sku = rawItem.sku || 'LH-OPTICAL';
      let brand = rawItem.brand || 'The Lens Hut';
      let itemName = rawItem.name || 'Optical Eyewear';
      let image = rawItem.image || '';

      const targetId =
        rawItem.productId ||
        rawItem.id ||
        (rawItem.product?._id ? rawItem.product._id.toString() : rawItem.product);

      if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
        const productDoc = await Product.findById(targetId);
        if (productDoc) {
          productRef = productDoc._id;
          sku = productDoc.sku || sku;
          brand = productDoc.brand || brand;
          itemName = productDoc.name || itemName;
          image = image || productDoc.images?.front || productDoc.primaryImage || '';

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

          stockUpdates.push({
            productId: productDoc._id,
            decrementBy: quantity,
          });
        }
      }

      preparedItems.push({
        product: productRef,
        productId: targetId ? targetId.toString() : '',
        productType: rawItem.productType || rawItem.configuration?.productType || 'eyeglasses',
        name: itemName,
        brand,
        sku,
        image,
        selectedColor: rawItem.selectedColor || rawItem.variantName || 'Standard',
        selectedSize: rawItem.selectedSize || 'Standard',
        variantId: rawItem.variantId || 'default',
        variantName: rawItem.variantName || 'Default',
        quantity,
        unitPrice,
        totalPrice: itemTotalPrice,
        configuration: rawItem.configuration || {},
      });
    }

    // 5. Deduct inventory stock atomically
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(update.productId, {
        $inc: { stock: -update.decrementBy },
      });
    }

    // 6. Generate order identifiers & financial totals
    const orderNumber = await generateUniqueOrderNumber();
    const trackingNumber = generateTrackingNumber();

    const calcSubtotal = Number(subtotal) || preparedItems.reduce((acc, i) => acc + i.totalPrice, 0);
    const calcDiscount = Number(discountAmount !== undefined ? discountAmount : discount) || 0;
    const calcShipping = Number(shippingFee !== undefined ? shippingFee : shipping) || 0;
    const calcTotal = Number(totalAmount !== undefined ? totalAmount : total) || Math.max(0, calcSubtotal - calcDiscount + calcShipping);

    const prescriptionData = extractPrescriptionData(prescription, preparedItems);

    // 7. Create Order document
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
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: paymentStatus || 'Paid',
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

    const savedOrder = await newOrder.save();

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

    // Authorization check: if authenticated user is non-admin, ensure order belongs to them
    if (
      req.user &&
      req.user.role !== 'admin' &&
      order.user &&
      order.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order',
        errorCode: 'FORBIDDEN_ORDER_ACCESS',
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
