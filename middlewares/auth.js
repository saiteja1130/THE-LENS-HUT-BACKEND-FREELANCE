import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes: verify JWT Bearer token and attach active user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to continue.',
      errorCode: 'UNAUTHORIZED',
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured on the server');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' 
        ? 'Your session has expired. Please sign in again.' 
        : 'Invalid authentication token.',
      errorCode: 'INVALID_TOKEN',
    });
  }
};

/**
 * Restrict access to specific roles (e.g. 'admin')
 * Admin has all visibility; User has restricted access.
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.',
        errorCode: 'FORBIDDEN',
      });
    }
    next();
  };
};

/**
 * Ensure email verification is completed
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user || !req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification is mandatory. Please verify your email first.',
      errorCode: 'EMAIL_NOT_VERIFIED',
      data: {
        email: req.user ? req.user.email : undefined,
      },
    });
  }
  next();
};

/**
 * Optional authentication: if Bearer token is provided, verify and attach user to req.user.
 * If not provided or invalid/expired, gracefully continue as guest without 401 error.
 */
export const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    if (!process.env.JWT_SECRET) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

