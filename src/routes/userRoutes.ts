import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate, sanitizeRequest } from '../middleware/validation';
import {
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  getUserByIdSchema,
  getUsersQuerySchema,
  bulkUserOperationSchema,
  deleteUserSchema,
  getUserActivitySchema,
  emailValidationSchema,
} from '../validators/userValidators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// Authentication is handled individually by requireAuth/requireAdmin

/**
 * GET /users - Get all users (Admin only)
 */
router.get(
  '/',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(getUsersQuerySchema),
  UserController.getUsers
);

/**
 * GET /users/stats - Get user statistics (Admin only)
 */
router.get(
  '/stats',
  ...requireAdmin(),
  UserController.getUserStats
);

/**
 * POST /users - Create new user (Admin only)
 */
router.post(
  '/',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(createUserSchema),
  UserController.createUser
);

/**
 * POST /users/bulk - Bulk user operations (Admin only)
 */
router.post(
  '/bulk',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(bulkUserOperationSchema),
  UserController.bulkUserOperation
);

/**
 * POST /users/check-email - Check email availability
 */
router.post(
  '/check-email',
  ...requireAuth(),
  sanitizeRequest(),
  validate(emailValidationSchema),
  UserController.checkEmailAvailability
);

/**
 * GET /users/:id - Get user by ID (Admin only)
 */
router.get(
  '/:id',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(getUserByIdSchema),
  UserController.getUserById
);

/**
 * PUT /users/:id - Update user (Admin only)
 */
router.put(
  '/:id',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(updateUserSchema),
  UserController.updateUser
);

/**
 * PATCH /users/:id/role - Update user role (Admin only)
 */
router.patch(
  '/:id/role',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(updateUserRoleSchema),
  UserController.updateUserRole
);

/**
 * DELETE /users/:id - Delete user (Admin only)
 */
router.delete(
  '/:id',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(deleteUserSchema),
  UserController.deleteUser
);

/**
 * GET /users/:id/activity - Get user activity logs
 */
router.get(
  '/:id/activity',
  ...requireAuth(),
  sanitizeRequest(),
  validate(getUserActivitySchema),
  UserController.getUserActivity
);

export default router; 