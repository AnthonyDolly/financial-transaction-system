import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt';
import { ApiResponseUtil } from '../utils/response';
import { AuthenticatedRequest, AuthMiddlewareOptions } from '../types/auth';
import { prisma } from '../config/database';
import { redisClient } from '../utils/redisClient';
import { logger } from '../utils/logger';

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = (options: AuthMiddlewareOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = JwtUtil.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        if (options.optional) {
          return next();
        }
        ApiResponseUtil.unauthorized(res, 'Access token is required');
        return;
      }

      // Check if token is blacklisted in Redis
      try {
        const isBlacklisted = await redisClient.get(`blacklist:jwt:${token}`);
        if (isBlacklisted) {
          ApiResponseUtil.unauthorized(res, 'Token has been revoked');
          return;
        }
      } catch (redisError) {
        logger.warn('Failed to check token blacklist in Redis:', redisError);
        // Continue without Redis check - token verification will still work
      }

      const decoded = JwtUtil.verifyAccessToken(token);
      if (!decoded) {
        ApiResponseUtil.unauthorized(res, 'Invalid or expired token');
        return;
      }

      // Get user from database to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        ApiResponseUtil.unauthorized(res, 'User not found');
        return;
      }

      if (!user.isActive) {
        ApiResponseUtil.unauthorized(res, 'User account is deactivated');
        return;
      }

      // Add user to request object
      req.user = user;

      next();
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      ApiResponseUtil.serverError(res, 'Authentication failed');
      return;
    }
  };
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (allowedRoles: ('USER' | 'ADMIN')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponseUtil.unauthorized(res, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ApiResponseUtil.forbidden(
        res,
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
      return;
    }

    next();
  };
};

/**
 * Combined middleware for authentication and authorization
 */
export const requireAuth = (
  allowedRoles: ('USER' | 'ADMIN')[] = ['USER', 'ADMIN'],
  options: AuthMiddlewareOptions = {}
) => {
  return [authenticate(options), authorize(allowedRoles)];
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = () => {
  return requireAuth(['ADMIN']);
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = () => {
  return authenticate({ optional: true });
}; 