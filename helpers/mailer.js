import nodemailer from 'nodemailer';

// Create transporter only if credentials exist
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

/**
 * Send 6-digit email verification OTP
 */
export const sendEmailVerificationOTP = async (email, otp, fullName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"The Lens Hut" <noreply@thelenshut.com>',
    to: email,
    subject: `${otp} is your email verification code - The Lens Hut`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #14232E; margin: 0;">The Lens Hut</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Premium Eyewear & Optics</p>
        </div>
        <p style="color: #374151; font-size: 16px;">Hello <strong>${fullName || 'there'}</strong>,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          Thank you for signing up with The Lens Hut. Please use the verification code below to verify your email address and activate your account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f3f4f6; padding: 14px 28px; border-radius: 8px; letter-spacing: 6px; font-size: 30px; font-weight: 800; color: #E4232C; border: 1px dashed #d1d5db;">
            ${otp}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          This code is valid for <strong>10 minutes</strong>. If you did not create an account, please ignore this email.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[Email] Verification OTP sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`[Email Error] Failed to send email to ${email}:`, err.message);
      return false;
    }
  } else {
    // Development fallback logger
    console.log(`\n======================================================`);
    console.log(`[DEVELOPMENT EMAIL DISPATCH] Verification OTP for ${email}: ${otp}`);
    console.log(`======================================================\n`);
    return true;
  }
};

/**
 * Send 6-digit Login OTP
 */
export const sendLoginOTP = async (email, otp, fullName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"The Lens Hut" <noreply@thelenshut.com>',
    to: email,
    subject: `${otp} is your The Lens Hut login code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #14232E; margin: 0;">The Lens Hut</h2>
        </div>
        <p style="color: #374151; font-size: 16px;">Hello <strong>${fullName || 'there'}</strong>,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          Use the one-time code below to log in to your account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f3f4f6; padding: 14px 28px; border-radius: 8px; letter-spacing: 6px; font-size: 30px; font-weight: 800; color: #14232E; border: 1px dashed #d1d5db;">
            ${otp}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[Email] Login OTP sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`[Email Error] Failed to send login OTP to ${email}:`, err.message);
      return false;
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[DEVELOPMENT EMAIL DISPATCH] Login OTP for ${email}: ${otp}`);
    console.log(`======================================================\n`);
    return true;
  }
};

/**
 * Send Order Confirmation Email
 */
export const sendOrderConfirmationEmail = async (email, order, fullName) => {
  const transporter = createTransporter();
  const orderNumber = order?.orderNumber || 'LH-ORDER';
  const orderTotal = order?.total || order?.totalAmount || 0;
  const itemsCount = order?.items?.length || 0;
  const trackingNumber = order?.trackingNumber || order?.tracking?.trackingNumber || 'LH-EXP-000000';
  const estimatedDelivery = order?.estimatedDelivery || order?.tracking?.estimatedDelivery || 'Within 3–5 Business Days';

  const mailOptions = {
    from: process.env.SMTP_FROM || '"The Lens Hut" <noreply@thelenshut.com>',
    to: email,
    subject: `Order Confirmed: ${orderNumber} - The Lens Hut`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #14232E; margin: 0;">The Lens Hut</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Premium Eyewear & Optics</p>
        </div>
        <p style="color: #374151; font-size: 16px;">Hello <strong>${fullName || 'there'}</strong>,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          Thank you for choosing The Lens Hut! Your order <strong>#${orderNumber}</strong> has been received and is now being processed by our optical lab.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Order Number:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Items Ordered:</td>
              <td style="padding: 6px 0; text-align: right;">${itemsCount} item(s)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Total Amount:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #E4232C;">₹${orderTotal}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Tracking ID:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace;">${trackingNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Estimated Delivery:</td>
              <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: 600;">${estimatedDelivery}</td>
            </tr>
          </table>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
          You can track the progress of your optical prescription assembly and courier dispatch anytime by logging into your account dashboard.
        </p>
        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            The Lens Hut Optical Laboratories · High Precision Eyewear
          </p>
        </div>
      </div>
    `,
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[Email] Order confirmation sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`[Email Error] Failed to send order email to ${email}:`, err.message);
      return false;
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[DEVELOPMENT EMAIL DISPATCH] Order Confirmation for ${email}: Order ${orderNumber} (Total ₹${orderTotal})`);
    console.log(`======================================================\n`);
    return true;
  }
};

