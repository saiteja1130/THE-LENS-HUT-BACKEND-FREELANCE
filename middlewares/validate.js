import { validationResult } from 'express-validator';

/**
 * Middleware that inspects express-validator results
 * and converts them into a clean, predictable key-value error map.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errorMap = {};
    result.array().forEach((err) => {
      // Keep first error message for each field
      if (!errorMap[err.path]) {
        errorMap[err.path] = err.msg;
      }
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed on submitted fields',
      errorCode: 'VALIDATION_ERROR',
      errors: errorMap,
    });
  }
  next();
};

export default validate;
