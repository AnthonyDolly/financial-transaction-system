import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { AuthService } from '../services/authService';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
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
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - confirmPassword
 *         - agreeToTerms
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           example: "Password123!"
 *         confirmPassword:
 *           type: string
 *           example: "Password123!"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         agreeToTerms:
 *           type: boolean
 *           example: true
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             role:
 *               type: string
 *               enum: [USER, ADMIN]
 *             isActive:
 *               type: boolean
 *         tokens:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 */

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Bad request - validation error
   *       409:
   *         description: User already exists
   *       500:
   *         description: Internal server error
   */
  static register = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const { email, password, firstName, lastName } = req.body;

      try {
        const result = await AuthService.register({
          email,
          password,
          firstName,
          lastName,
        });

        ApiResponseUtil.created(res, result, 'User registered successfully');
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
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Internal server error
   */
  static login = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const { email, password } = req.body;

      try {
        const result = await AuthService.login({ email, password });

        ApiResponseUtil.success(res, result, 'Login successful');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Invalid credentials' || err.message === 'Account is deactivated') {
          ApiResponseUtil.unauthorized(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
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
   *                         accessToken:
   *                           type: string
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Invalid refresh token
   *       500:
   *         description: Internal server error
   */
  static refreshToken = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const { refreshToken } = req.body;

      try {
        const result = await AuthService.refreshToken({ refreshToken });

        ApiResponseUtil.success(res, result, 'Token refreshed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message.includes('Invalid') || err.message.includes('not found')) {
          ApiResponseUtil.unauthorized(res, 'Invalid refresh token');
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
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
   *       500:
   *         description: Internal server error
   */
  static getProfile = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      try {
        const profile = await AuthService.getProfile(req.user.id);
        ApiResponseUtil.success(res, profile, 'Profile retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /auth/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
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
   *     responses:
   *       200:
   *         description: Profile updated successfully
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
   *       500:
   *         description: Internal server error
   */
  static updateProfile = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      const { firstName, lastName } = req.body;

      try {
        const profile = await AuthService.updateProfile(req.user.id, {
          firstName,
          lastName,
        });

        ApiResponseUtil.success(res, profile, 'Profile updated successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *               - confirmPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Bad request - validation error
   *       401:
   *         description: Unauthorized or incorrect current password
   *       500:
   *         description: Internal server error
   */
  static changePassword = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      const { currentPassword, newPassword } = req.body;

      try {
        await AuthService.changePassword(req.user.id, {
          currentPassword,
          newPassword,
        });

        ApiResponseUtil.success(res, null, 'Password changed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Current password is incorrect') {
          ApiResponseUtil.unauthorized(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */

  static logout = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      // Blacklist JWT token
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const token =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.substring(7)
          : undefined;

      if (token) {
        try {
          // Decode token to get expiry
          const decoded = jwt.decode(token) as { exp?: number } | null;
          let ttl = 3600; // default 1 hour
          if (decoded && decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            ttl = decoded.exp - now;
          }
          if (ttl > 0) {
            await redisClient.set(`blacklist:jwt:${token}`, '1', { EX: ttl });
          }
        } catch (e) {
          logger.warn('Failed to decode or store JWT in Redis blacklist', e);
        }
      }

      // Clear stored tokens from Redis
      try {
        await redisClient.del(`token:access:${req.user.id}`);
        await redisClient.del(`token:refresh:${req.user.id}`);
      } catch (e) {
        logger.warn('Failed to clear stored tokens from Redis', e);
      }

      ApiResponseUtil.success(res, null, 'Logout successful');
    }
  );

  /**
   * @swagger
   * /auth/deactivate:
   *   post:
   *     summary: Deactivate user account
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account deactivated successfully
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  static deactivateAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      try {
        await AuthService.deactivateAccount(req.user.id);
        ApiResponseUtil.success(res, null, 'Account deactivated successfully');
      } catch (error) {
        throw error;
      }
    }
  );
}
