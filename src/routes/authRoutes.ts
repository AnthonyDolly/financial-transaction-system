import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate, sanitizeRequest } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/authValidators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication and user management endpoints
 */

// Public routes (no authentication required)
/**
 * Register a new user
 */
router.post(
  '/register',
  sanitizeRequest(),
  validate(registerSchema),
  AuthController.register
);

/**
 * Login user
 */
router.post(
  '/login',
  sanitizeRequest(),
  validate(loginSchema),
  AuthController.login
);

/**
 * Refresh access token
 */
router.post(
  '/refresh',
  sanitizeRequest(),
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

// Protected routes (authentication required)
/**
 * Get user profile
 */
router.get(
  '/profile',
  authenticate(),
  AuthController.getProfile
);

/**
 * Update user profile
 */
router.put(
  '/profile',
  authenticate(),
  sanitizeRequest(),
  validate(updateProfileSchema),
  AuthController.updateProfile
);

/**
 * Change password
 */
router.post(
  '/change-password',
  authenticate(),
  sanitizeRequest(),
  validate(changePasswordSchema),
  AuthController.changePassword
);

/**
 * Logout user
 */
router.post(
  '/logout',
  authenticate(),
  AuthController.logout
);

/**
 * Deactivate user account
 */
router.post(
  '/deactivate',
  authenticate(),
  AuthController.deactivateAccount
);

export default router; 