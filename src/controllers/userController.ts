import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { UserService } from '../services/userService';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "cmddybmu40000vt4g734qx48k"
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *           example: "USER"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *         account:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             balance:
 *               type: number
 *               example: 1000.50
 *             currency:
 *               type: string
 *               example: "USD"
 *             isActive:
 *               type: boolean
 *               example: true
 *
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           example: "Password123!"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *           example: "USER"
 */

export class UserController {
  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Get all users (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of users per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in email, firstName, lastName
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [USER, ADMIN]
   *         description: Filter by role
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, email, firstName, lastName]
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   *       500:
   *         description: Internal server error
   */
  static getUsers = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await UserService.getUsers(req.query, req.user.id);
        ApiResponseUtil.paginated(res, result.data, result.meta, 'Users retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  static getUserById = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.getUserById(id, req.user.id);
        ApiResponseUtil.success(res, user, 'User retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create new user (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/User'
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   *       409:
   *         description: User already exists
   *       500:
   *         description: Internal server error
   */
  static createUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const user = await UserService.createUser(req.body, req.user.id);
        ApiResponseUtil.created(res, user, 'User created successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User with this email already exists') {
          ApiResponseUtil.conflict(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Update user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *                 example: "John"
   *               lastName:
   *                 type: string
   *                 example: "Doe"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               isActive:
   *                 type: boolean
   *                 example: true
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/User'
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   *       404:
   *         description: User not found
   *       409:
   *         description: Email already in use
   *       500:
   *         description: Internal server error
   */
  static updateUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.updateUser(id, req.body, req.user.id);
        ApiResponseUtil.success(res, user, 'User updated successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'Email is already in use by another user') {
          ApiResponseUtil.conflict(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/{id}/role:
   *   patch:
   *     summary: Update user role (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - role
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [USER, ADMIN]
   *                 example: "ADMIN"
   *     responses:
   *       200:
   *         description: User role updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/User'
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required or cannot change own role
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  static updateUserRole = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.updateUserRole(id, req.body, req.user.id);
        ApiResponseUtil.success(res, user, 'User role updated successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You cannot change your own role') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete user (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User deleted successfully
   *       400:
   *         description: Cannot delete user with non-zero balance
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required or cannot delete own account
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  static deleteUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        await UserService.deleteUser(id, req.user.id);
        ApiResponseUtil.success(res, null, 'User deleted successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You cannot delete your own account') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message.includes('non-zero account balance')) {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/stats:
   *   get:
   *     summary: Get user statistics (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: number
   *                           example: 150
   *                         active:
   *                           type: number
   *                           example: 142
   *                         inactive:
   *                           type: number
   *                           example: 8
   *                         byRole:
   *                           type: object
   *                           properties:
   *                             USER:
   *                               type: number
   *                               example: 145
   *                             ADMIN:
   *                               type: number
   *                               example: 5
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   *       500:
   *         description: Internal server error
   */
  static getUserStats = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const stats = await UserService.getUserStats(req.user.id);
        ApiResponseUtil.success(res, stats, 'User statistics retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/bulk:
   *   post:
   *     summary: Bulk user operations (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userIds
   *               - action
   *             properties:
   *               userIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["user1", "user2", "user3"]
   *               action:
   *                 type: string
   *                 enum: [activate, deactivate, delete]
   *                 example: "deactivate"
   *     responses:
   *       200:
   *         description: Bulk operation completed
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         success:
   *                           type: number
   *                           example: 2
   *                         failed:
   *                           type: array
   *                           items:
   *                             type: string
   *                           example: ["user3: Cannot delete user with non-zero balance"]
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   *       500:
   *         description: Internal server error
   */
  static bulkUserOperation = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const results = await UserService.bulkUserOperation(req.body, req.user.id);
        ApiResponseUtil.success(res, results, `Bulk ${req.body.action} operation completed`);
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/{id}/activity:
   *   get:
   *     summary: Get user activity logs
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *       - in: query
   *         name: action
   *         schema:
   *           type: string
   *         description: Filter by action
   *       - in: query
   *         name: resource
   *         schema:
   *           type: string
   *         description: Filter by resource
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date filter
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date filter
   *     responses:
   *       200:
   *         description: User activity logs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           action:
   *                             type: string
   *                           resource:
   *                             type: string
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                           ipAddress:
   *                             type: string
   *                           userAgent:
   *                             type: string
   *                           metadata:
   *                             type: object
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   *       500:
   *         description: Internal server error
   */
  static getUserActivity = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const result = await UserService.getUserActivity(id, req.query, req.user.id, req.user.role);
        ApiResponseUtil.paginated(
          res,
          result.data,
          result.meta,
          'User activity logs retrieved successfully'
        );
      } catch (error) {
        const err = error as Error;
        if (err.message === 'You can only access your own activity logs') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /users/check-email:
   *   post:
   *     summary: Check email availability
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *     responses:
   *       200:
   *         description: Email availability checked
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         available:
   *                           type: boolean
   *                           example: true
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  static checkEmailAvailability = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await UserService.checkEmailAvailability(req.body.email);
        ApiResponseUtil.success(res, result, 'Email availability checked');
      } catch (error) {
        throw error;
      }
    }
  );
}
