import crypto from 'crypto';
import Razorpay from 'razorpay';
import PendingPayment from '../models/PendingPayment.js';
import { finalizeOrderFromPayment } from '../helpers/orderFinalizer.js';

/**
 * Lazy initializer for Razorpay SDK client using environment variables
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * @desc    Create Razorpay Order & stage checkout session (Deferred order creation)
 * @route   POST /api/create-order or POST /api/v1/payment/create-order
 * @access  Public / Optional Auth
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, orderData = {} } = req.body;

    // Check credentials presence
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Razorpay payment gateway credentials are not configured.',
        errorCode: 'RAZORPAY_AUTH_FAILED',
      });
    }

    // Validate amount (must be in paise, minimum 100 paise = 1 INR)
    const numericAmount = Math.round(Number(amount));
    if (isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is 100 paise (₹1.00).',
        errorCode: 'INVALID_AMOUNT',
      });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(401).json({
        success: false,
        message: 'Razorpay client initialization failed.',
        errorCode: 'RAZORPAY_AUTH_FAILED',
      });
    }

    const options = {
      amount: numericAmount,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        userId: req.user ? req.user._id.toString() : 'guest',
        customerEmail: orderData.customerEmail || req.user?.email || '',
      },
    };

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create(options);
    } catch (rzpErr) {
      console.error('[Razorpay createOrder SDK Error]:', rzpErr);
      return res.status(500).json({
        success: false,
        message: rzpErr.error?.description || rzpErr.message || 'Razorpay order creation failed on provider.',
        errorCode: 'RAZORPAY_API_ERROR',
      });
    }

    // Stage checkout data in PendingPayment session without creating a final Order document
    // This guarantees uncompleted / abandoned payments never appear in customer order history
    await PendingPayment.create({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      status: 'pending',
      orderData: {
        ...orderData,
        userId: req.user ? req.user._id : null,
      },
      user: req.user ? req.user._id : null,
    });

    return res.status(200).json({
      success: true,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
    });
  } catch (error) {
    console.error('[paymentController createRazorpayOrder]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while creating payment order.',
      errorCode: 'ORDER_CREATION_FAILED',
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature & finalize Order in database
 * @route   POST /api/verify-payment or POST /api/v1/payment/verify-payment
 * @access  Public
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
        errorCode: 'MISSING_VERIFICATION_FIELDS',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Razorpay secret is missing.',
        errorCode: 'SERVER_CONFIG_ERROR',
      });
    }

    // Compute expected signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const isSignatureValid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature)
      );

    if (!isSignatureValid) {
      console.warn('[Razorpay verifyPayment] Signature mismatch detected for order:', razorpay_order_id);
      // Signature mismatch: return 400, do NOT mark as paid, do NOT create order
      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Transaction cannot be validated.',
        errorCode: 'INVALID_SIGNATURE',
      });
    }

    // Signatures match! Finalize the order atomically in the database
    let confirmedOrder;
    try {
      confirmedOrder = await finalizeOrderFromPayment(razorpay_order_id, {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
    } catch (finalizeErr) {
      console.error('[Razorpay verifyPayment] Finalize order error:', finalizeErr);
      return res.status(500).json({
        success: false,
        message: 'Payment succeeded but order finalization encountered an error: ' + finalizeErr.message,
        errorCode: 'ORDER_FINALIZATION_ERROR',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: confirmedOrder,
    });
  } catch (error) {
    console.error('[paymentController verifyRazorpayPayment]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while verifying payment.',
      errorCode: 'VERIFICATION_FAILED',
    });
  }
};

/**
 * @desc    Handle Razorpay Webhook background updates (user drop-off / closed tab)
 * @route   POST /api/webhook/razorpay or POST /api/v1/payment/webhook
 * @access  Public (Validated by X-Razorpay-Signature)
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing webhook signature or server secret',
      });
    }

    // Verify webhook signature with raw payload
    const rawBody = req.rawBody ? req.rawBody : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isValid) {
      console.warn('[Razorpay Webhook] Invalid webhook signature received.');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received verified event: ${event}`);

    // Handle payment/order completion events
    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderEntity = req.body.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id || '';

      if (razorpayOrderId) {
        try {
          await finalizeOrderFromPayment(razorpayOrderId, {
            razorpayPaymentId,
            razorpaySignature: signature,
          });
          console.log(`[Razorpay Webhook] Order for ${razorpayOrderId} successfully finalized via webhook.`);
        } catch (webhookFinalizeErr) {
          console.warn(`[Razorpay Webhook] Order finalization notice:`, webhookFinalizeErr.message);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[paymentController handleRazorpayWebhook]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Webhook processing failed',
    });
  }
};

