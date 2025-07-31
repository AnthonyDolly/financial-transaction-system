import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { AuthService } from '../services/authService';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';
import jwt from 'jsonwebtoken';

export class AuthController {
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
