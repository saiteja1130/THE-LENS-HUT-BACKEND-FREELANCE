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
