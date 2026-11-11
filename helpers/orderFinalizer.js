import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import PendingPayment from '../models/PendingPayment.js';
import { sendOrderConfirmationEmail } from './mailer.js';

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
const extractPrescriptionData = (payloadPrescription, items = []) => {
  if (
    payloadPrescription &&
    (payloadPrescription.hasPrescription ||
      payloadPrescription.fileUrl ||
      payloadPrescription.rxFile ||
      payloadPrescription.method === 'upload' ||
      payloadPrescription.method === 'manual')
  ) {
    const rxFile = payloadPrescription.rxFile || payloadPrescription.fileUrl || '';
    const isUpload = payloadPrescription.method === 'upload' || Boolean(rxFile || payloadPrescription.fileName);
    return {
      hasPrescription: true,
      method: payloadPrescription.method || (isUpload ? 'upload' : 'manual'),
      rightEye: payloadPrescription.rightEye || {},
      leftEye: payloadPrescription.leftEye || {},
      pd: payloadPrescription.pd || '63 mm',
      lensPackage: payloadPrescription.lensPackage || 'Optical Lab Custom Lens',
      rxFile: rxFile,
      fileUrl: payloadPrescription.fileUrl || rxFile,
      fileName: payloadPrescription.fileName || '',
      fileType: payloadPrescription.fileType || '',
      fileSize: payloadPrescription.fileSize || 0,
      notes: payloadPrescription.notes || '',
    };
  }

  const rxItem = (items || []).find(
    (i) =>
      i.configuration?.prescription?.hasPrescription ||
      i.configuration?.prescription?.method === 'upload' ||
      i.configuration?.prescription?.fileUrl ||
      i.configuration?.prescription?.fileName ||
      i.configuration?.prescription?.rxFile ||
      i.configuration?.prescription?.od?.sph
  );

  if (rxItem?.configuration?.prescription) {
    const rx = rxItem.configuration.prescription;
    const isUpload = rx.method === 'upload' || Boolean(rx.fileUrl || rx.fileName || rx.rxFile);
    const fileUrl = rx.fileUrl || rx.rxFile || rx.url || '';
    return {
      hasPrescription: true,
      method: rx.method || (isUpload ? 'upload' : 'manual'),
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
      pd: rx.pd || '63 mm',
      lensPackage: rx.lensPackage || 'Prescription Lab Lens',
      rxFile: fileUrl,
      fileUrl: fileUrl,
      fileName: rx.fileName || '',
      fileType: rx.fileType || '',
      fileSize: rx.fileSize || 0,
      notes: rx.notes || '',
    };
  }

  return {
    hasPrescription: false,
    method: 'none',
    rightEye: { sph: '0.00', cyl: '0.00', axis: '-' },
    leftEye: { sph: '0.00', cyl: '0.00', axis: '-' },
    pd: '63 mm',
    lensPackage: 'Standard Frame Only',
    rxFile: '',
    fileUrl: '',
    fileName: '',
    fileType: '',
    fileSize: 0,
    notes: '',
  };
};

/**
 * Atomically finalizes a pending payment and creates a confirmed order in the database.
 * Completely idempotent: if already finalized by webhook or return URL, returns existing order.
 *
 * @param {string} razorpayOrderId
 * @param {Object} paymentDetails { razorpayPaymentId, razorpaySignature }
 * @returns {Promise<Object>} Confirmed Order document
 */
export const finalizeOrderFromPayment = async (razorpayOrderId, paymentDetails = {}) => {
  const pendingSession = await PendingPayment.findOne({ razorpayOrderId });

  if (!pendingSession) {
    // If pending session was cleaned up or not found, check if order was already finalized
    const existingOrder = await Order.findOne({ razorpayOrderId });
    if (existingOrder) {
      return existingOrder;
    }
    throw new Error(`PENDING_SESSION_NOT_FOUND: No pending payment found for ${razorpayOrderId}`);
  }

  // Idempotency: if already finalized, return existing order immediately
  if (pendingSession.status === 'completed' && pendingSession.createdOrderId) {
    const existingOrder = await Order.findById(pendingSession.createdOrderId);
    if (existingOrder) {
      return existingOrder;
    }
  }

  const { orderData } = pendingSession;
  const {
    items = [],
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
    prescription,
    notes,
    userId,
  } = orderData || {};

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('INVALID_ORDER_ITEMS: Order must contain at least one item');
  }

  // Assemble customer details
  const customer = {
    id: userId ? userId.toString() : customerInput?.id || 'cust-guest',
    name:
      customerInput?.name ||
      orderData.customerName ||
      shippingAddress?.fullName ||
      'Valued Customer',
    email:
      customerInput?.email ||
      orderData.customerEmail ||
      'customer@thelenshut.com',
    phone:
      customerInput?.phone ||
      orderData.customerPhone ||
      shippingAddress?.phone ||
      '',
  };

  // Validate stock & prepare items
  const preparedItems = [];
  const stockUpdates = [];

  for (const rawItem of items) {
    const quantity = Math.max(1, Number(rawItem.quantity) || 1);
    const targetId =
      rawItem.productId ||
      rawItem.id ||
      (rawItem.product?._id ? rawItem.product._id.toString() : rawItem.product);

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      throw new Error(`INVALID_PRODUCT_ID: ${targetId}`);
    }

    const productDoc = await Product.findById(targetId);
    if (!productDoc) {
      throw new Error(`PRODUCT_NOT_FOUND: Product "${rawItem.name || targetId}" not found`);
    }

    const unitBasePrice =
      typeof productDoc.offerPrice === 'number' && productDoc.offerPrice > 0
        ? productDoc.offerPrice
        : (productDoc.price || 0);

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

  // Deduct inventory atomically with rollback on failure
  const appliedStockUpdates = [];
  try {
    for (const update of stockUpdates) {
      const updatedDoc = await Product.findOneAndUpdate(
        { _id: update.productId, stock: { $gte: update.decrementBy } },
        { $inc: { stock: -update.decrementBy } },
        { new: true }
      );
      if (updatedDoc) {
        appliedStockUpdates.push(update);
      }
    }
  } catch (stockErr) {
    for (const rollback of appliedStockUpdates) {
      await Product.findByIdAndUpdate(rollback.productId, {
        $inc: { stock: rollback.decrementBy },
      }).catch(() => {});
    }
    throw stockErr;
  }

  // Generate numbers
  const orderNumber = await generateUniqueOrderNumber();
  const trackingNumber = generateTrackingNumber();

  const calcSubtotal = preparedItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const calcShipping = Number(shippingFee !== undefined ? shippingFee : shipping) || 0;
  const rawDiscount = Math.max(0, Number(discountAmount !== undefined ? discountAmount : discount) || 0);
  const calcDiscount = Math.min(calcSubtotal, rawDiscount);
  const calcTotal = Math.max(0, calcSubtotal - calcDiscount + calcShipping);

  const prescriptionData = extractPrescriptionData(prescription, preparedItems);

  // Create confirmed order
  const newOrder = new Order({
    orderNumber,
    user: userId || null,
    customer,
    items: preparedItems,
    shippingAddress: {
      id: shippingAddress?.id || 'addr-' + Date.now(),
      fullName: (shippingAddress?.fullName || customer.name).trim(),
      phone: (shippingAddress?.phone || customer.phone).trim(),
      street: (shippingAddress?.street || '').trim(),
      locality: (shippingAddress?.locality || '').trim(),
      city: (shippingAddress?.city || 'City').trim(),
      state: (shippingAddress?.state || 'State').trim(),
      pincode: (shippingAddress?.pincode || '').trim(),
      isDefault: shippingAddress?.isDefault !== undefined ? shippingAddress.isDefault : true,
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
    paymentMethod: 'Razorpay',
    paymentStatus: 'Paid',
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
    razorpayOrderId: razorpayOrderId,
    razorpayPaymentId: paymentDetails.razorpayPaymentId || pendingSession.razorpayPaymentId || '',
    razorpaySignature: paymentDetails.razorpaySignature || pendingSession.razorpaySignature || '',
    notes: notes || '',
    orderDate: new Date(),
  });

  const savedOrder = await newOrder.save();

  // Mark pending payment as completed
  pendingSession.status = 'completed';
  pendingSession.createdOrderId = savedOrder._id;
  if (paymentDetails.razorpayPaymentId) {
    pendingSession.razorpayPaymentId = paymentDetails.razorpayPaymentId;
  }
  if (paymentDetails.razorpaySignature) {
    pendingSession.razorpaySignature = paymentDetails.razorpaySignature;
  }
  await pendingSession.save();

  // Clear user cart if authenticated
  if (userId) {
    try {
      await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
    } catch (cartErr) {
      console.warn('[orderFinalizer] Cart cleanup notice:', cartErr.message);
    }
  }

  // Dispatch confirmation email
  if (customer.email && customer.email.includes('@')) {
    sendOrderConfirmationEmail(customer.email, savedOrder, customer.name).catch((mailErr) => {
      console.warn('[orderFinalizer] Confirmation email notice:', mailErr.message);
    });
  }

  return savedOrder;
};

