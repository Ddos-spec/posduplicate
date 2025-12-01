import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  register,
  getMe,
  changePassword
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateLogin, validateRegister } from '../middlewares/validation.middleware';

const router = Router();

// SECURITY: Rate limiting for authentication endpoints
// Prevent brute force attacks by limiting login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

// Public routes (with rate limiting and validation)
router.post('/login', authLimiter, validateLogin, login);
router.post('/register', authLimiter, validateRegister, register);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.post('/change-password', authMiddleware, changePassword);

export default router;
