import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmailVerificationOTP, sendLoginOTP } from '../helpers/mailer.js';

/**
 * Generate 6-digit numeric OTP
 */
const generateNumericOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sign JWT Token
 */
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server');
  }
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Helper to sanitize user object returned to client
 */
const formatUserResponse = (user) => {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    avatar: user.avatar || '',
    createdAt: user.createdAt,
  };
};

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user & issue mandatory email verification code
 * @access  Public
 */
export const signup = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
          errorCode: 'EMAIL_ALREADY_EXISTS',
          errors: {
            email: 'An account with this email address already exists',
          },
        });
      }

      // If user exists but is not verified yet, update details & resend fresh OTP
      const otp = generateNumericOTP();
      existingUser.fullName = fullName;
      existingUser.phone = phone || existingUser.phone;
      existingUser.password = password; // Will be hashed by pre('save') hook
      existingUser.emailVerificationOTP = otp;
      existingUser.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      await existingUser.save();

      await sendEmailVerificationOTP(normalizedEmail, otp, fullName);

      return res.status(200).json({
        success: true,
        message: 'Account already created but unverified. A new verification code has been sent to your email.',
        data: {
          email: normalizedEmail,
          requiresVerification: true,
        },
      });
    }

    // Generate 6-digit OTP
    const otp = generateNumericOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = new User({
      fullName,
      email: normalizedEmail,
      phone: phone || '',
      password,
      role: 'user', // Default role
      isEmailVerified: false, // Mandatory verification
      emailVerificationOTP: otp,
      emailVerificationExpiresAt: otpExpiry,
    });

    await user.save();

    // Send email verification OTP
    await sendEmailVerificationOTP(normalizedEmail, otp, fullName);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully! Please enter the 6-digit code sent to your email to verify your account.',
      data: {
        email: normalizedEmail,
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error('[Signup Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing signup. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email using 6-digit OTP and complete onboarding
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationOTP +emailVerificationExpiresAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found with this email address.',
        errorCode: 'USER_NOT_FOUND',
        errors: {
          email: 'No user found with this email',
        },
      });
    }

    if (user.isEmailVerified) {
      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        message: 'Email is already verified. You are logged in.',
        data: {
          token,
          user: formatUserResponse(user),
        },
      });
    }

    // Verify OTP expiry
    if (
      !user.emailVerificationExpiresAt ||
      new Date() > new Date(user.emailVerificationExpiresAt)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        errorCode: 'OTP_EXPIRED',
        errors: {
          otp: 'Verification code has expired. Please request a fresh one.',
        },
      });
    }

    // Verify OTP match
    if (user.emailVerificationOTP !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.',
        errorCode: 'INVALID_OTP',
        errors: {
          otp: 'Invalid 6-digit code. Please verify and try again.',
        },
      });
    }

    // Mark as verified & clear OTP
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    // Issue JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to The Lens Hut.',
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('[Verify Email Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend a new email verification OTP
 * @access  Public
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationExpiresAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found with this email address.',
        errorCode: 'USER_NOT_FOUND',
        errors: {
          email: 'No account found with this email',
        },
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please proceed to login.',
        errorCode: 'ALREADY_VERIFIED',
      });
    }

    const otp = generateNumericOTP();
    user.emailVerificationOTP = otp;
    user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    await sendEmailVerificationOTP(normalizedEmail, otp, user.fullName);

    return res.status(200).json({
      success: true,
      message: 'A fresh 6-digit verification code has been sent to your email.',
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error('[Resend OTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification code. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with Email and Password
 * @access  Public
 */
export const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Fetch user with hidden password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errorCode: 'INVALID_CREDENTIALS',
        errors: {
          email: 'No registered account found with this email address',
        },
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errorCode: 'INVALID_CREDENTIALS',
        errors: {
          password: 'The password you entered is incorrect',
        },
      });
    }

    // Mandatory Email Verification Check
    if (!user.isEmailVerified) {
      // Auto-dispatch a fresh verification OTP
      const otp = generateNumericOTP();
      user.emailVerificationOTP = otp;
      user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendEmailVerificationOTP(normalizedEmail, otp, user.fullName);

      return res.status(403).json({
        success: false,
        message: 'Email verification is mandatory before logging in. A new 6-digit code has been sent to your email.',
        errorCode: 'EMAIL_NOT_VERIFIED',
        data: {
          email: normalizedEmail,
          requiresVerification: true,
        },
      });
    }

    // User is verified: generate token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sign in. Please try again later.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/auth/request-otp
 * @desc    Request OTP for passwordless login
 * @access  Public
 */
export const requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email. Please sign up first.',
        errorCode: 'USER_NOT_FOUND',
        errors: {
          email: 'No account found with this email address',
        },
      });
    }

    const otp = generateNumericOTP();
    user.loginOTP = otp;
    user.loginOTPExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await user.save();

    await sendLoginOTP(normalizedEmail, otp, user.fullName);

    return res.status(200).json({
      success: true,
      message: 'A 6-digit login OTP has been sent to your email.',
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error('[Request Login OTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send login code. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP for passwordless login
 * @access  Public
 */
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+loginOTP +loginOTPExpiresAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
        errorCode: 'USER_NOT_FOUND',
        errors: {
          email: 'Account not found',
        },
      });
    }

    if (!user.loginOTPExpiresAt || new Date() > new Date(user.loginOTPExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Login code has expired. Please request a new code.',
        errorCode: 'OTP_EXPIRED',
        errors: {
          otp: 'Login code has expired. Please request a new code.',
        },
      });
    }

    if (user.loginOTP !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login code.',
        errorCode: 'INVALID_OTP',
        errors: {
          otp: 'Incorrect 6-digit code. Please try again.',
        },
      });
    }

    // Valid login OTP confirms email ownership: auto-verify if not yet verified
    user.isEmailVerified = true;
    user.loginOTP = undefined;
    user.loginOTPExpiresAt = undefined;
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully via OTP!',
      data: {
        token,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('[Verify Login OTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify login code. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently logged-in user profile
 * @access  Private (Bearer Token)
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(req.user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.',
      errorCode: 'SERVER_ERROR',
    });
  }
};
