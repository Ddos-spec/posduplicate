import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  return next();
};

/**
 * Auth validation rules
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

/**
 * Transaction validation rules
 */
export const validateCreateTransaction = [
  body('orderType')
    .isString()
    .notEmpty()
    .isIn(['dine_in', 'takeaway', 'delivery'])
    .withMessage('Order type must be one of: dine_in, takeaway, delivery'),
  body('outletId')
    .isInt({ min: 1 })
    .withMessage('Valid outlet ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.itemId')
    .isInt({ min: 1 })
    .withMessage('Valid item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('payments')
    .optional()
    .isArray(),
  body('payments.*.method')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Payment method is required'),
  body('payments.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be positive'),
  handleValidationErrors
];

/**
 * Product validation rules
 */
export const validateCreateProduct = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Product name is required')
    .trim(),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('outletId')
    .isInt({ min: 1 })
    .withMessage('Valid outlet ID is required'),
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('sku')
    .optional()
    .isString()
    .trim(),
  handleValidationErrors
];

/**
 * Category validation rules
 */
export const validateCreateCategory = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Category name is required')
    .trim(),
  body('type')
    .optional()
    .isIn(['item', 'ingredient'])
    .withMessage('Type must be either item or ingredient'),
  body('outletId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid outlet ID is required'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

/**
 * Email validation
 */
export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors
];

/**
 * Outlet validation rules
 */
export const validateCreateOutlet = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Outlet name is required')
    .trim(),
  body('address')
    .optional()
    .isString()
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];
