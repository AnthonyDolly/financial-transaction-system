import bcrypt from 'bcryptjs';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { JwtUtil } from '../utils/jwt';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redisClient } from '../utils/redisClient';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserPayload,
  RefreshTokenRequest,
  ChangePasswordRequest,
} from '../types/auth';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, config.BCRYPT_SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          role: UserRole.USER,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      logger.info(`User registered: ${user.email}`);

      // Create user payload
      const userPayload: UserPayload = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      };

      // Generate tokens
      const tokens = JwtUtil.generateTokens(userPayload);

      // Create account for new user
      await prisma.account.create({
        data: {
          userId: user.id,
          balance: 0.0,
          currency: 'USD',
        },
      });

      // Log audit event
      await this.logAuditEvent(user.id, 'CREATE', 'User', user.id, null, {
        email: user.email,
        role: user.role,
      });

      return {
        user: userPayload,
        tokens,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Create user payload
      const userPayload: UserPayload = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      };

      // Generate tokens
      const tokens = JwtUtil.generateTokens(userPayload);

      // Store tokens in Redis with expiration
      try {
        const accessTokenExpiry = JwtUtil.getTokenExpiration(tokens.accessToken);
        const refreshTokenExpiry = JwtUtil.getTokenExpiration(tokens.refreshToken);

        if (accessTokenExpiry) {
          const accessTokenTTL = Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000);
          if (accessTokenTTL > 0) {
            await redisClient.set(`token:access:${user.id}`, tokens.accessToken, {
              EX: accessTokenTTL,
            });
          }
        }

        if (refreshTokenExpiry) {
          const refreshTokenTTL = Math.floor((refreshTokenExpiry.getTime() - Date.now()) / 1000);
          if (refreshTokenTTL > 0) {
            await redisClient.set(`token:refresh:${user.id}`, tokens.refreshToken, {
              EX: refreshTokenTTL,
            });
          }
        }
      } catch (redisError) {
        logger.warn('Failed to store tokens in Redis:', redisError);
        // Continue without Redis storage - tokens will still work
      }

      // Log audit event
      await this.logAuditEvent(user.id, 'LOGIN', 'User', user.id);

      return {
        user: userPayload,
        tokens,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(data: RefreshTokenRequest): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = JwtUtil.verifyRefreshToken(data.refreshToken);
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token is blacklisted in Redis
      try {
        const isBlacklisted = await redisClient.get(`blacklist:jwt:${data.refreshToken}`);
        if (isBlacklisted) {
          throw new Error('Refresh token has been revoked');
        }
      } catch (redisError) {
        logger.warn('Failed to check refresh token blacklist in Redis:', redisError);
        // Continue without Redis check
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Verify that the refresh token matches the one stored in Redis (if available)
      try {
        const storedRefreshToken = await redisClient.get(`token:refresh:${user.id}`);
        if (storedRefreshToken && storedRefreshToken !== data.refreshToken) {
          throw new Error('Invalid refresh token');
        }
      } catch (redisError) {
        logger.warn('Failed to verify refresh token in Redis:', redisError);
        // Continue without Redis verification
      }

      // Create user payload
      const userPayload: UserPayload = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      };

      // Generate new access token
      const accessToken = JwtUtil.generateAccessToken(userPayload);

      // Store new access token in Redis
      try {
        const accessTokenExpiry = JwtUtil.getTokenExpiration(accessToken);
        if (accessTokenExpiry) {
          const accessTokenTTL = Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000);
          if (accessTokenTTL > 0) {
            await redisClient.set(`token:access:${user.id}`, accessToken, { EX: accessTokenTTL });
          }
        }
        logger.info(`New access token stored in Redis for user: ${user.email}`);
      } catch (redisError) {
        logger.warn('Failed to store new access token in Redis:', redisError);
        // Continue without Redis storage
      }

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(data.newPassword, config.BCRYPT_SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      logger.info(`Password changed for user: ${user.email}`);

      // Log audit event
      await this.logAuditEvent(userId, 'UPDATE', 'User', userId, null, {
        action: 'password_change',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserPayload> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      };
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<UserPayload> {
    try {
      const updateData: Partial<Pick<User, 'firstName' | 'lastName'>> = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      logger.info(`Profile updated for user: ${user.email}`);

      // Log audit event
      await this.logAuditEvent(userId, 'UPDATE', 'User', userId, null, data);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      };
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateAccount(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Deactivate user
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Revoke all tokens for this user
      await this.revokeAllUserTokens(userId);

      logger.info(`Account deactivated for user: ${user.email}`);

      // Log audit event
      await this.logAuditEvent(userId, 'UPDATE', 'User', userId, null, {
        action: 'account_deactivation',
      });
    } catch (error) {
      logger.error('Deactivate account error:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Get stored tokens from Redis
      const accessToken = await redisClient.get(`token:access:${userId}`);
      const refreshToken = await redisClient.get(`token:refresh:${userId}`);

      // Blacklist tokens if they exist
      if (accessToken) {
        const decoded = jwt.decode(accessToken) as { exp?: number } | null;
        let ttl = 3600; // default 1 hour
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          ttl = decoded.exp - now;
        }
        if (ttl > 0) {
          await redisClient.set(`blacklist:jwt:${accessToken}`, '1', { EX: ttl });
        }
      }

      if (refreshToken) {
        const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
        let ttl = 86400; // default 24 hours for refresh tokens
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          ttl = decoded.exp - now;
        }
        if (ttl > 0) {
          await redisClient.set(`blacklist:jwt:${refreshToken}`, '1', { EX: ttl });
        }
      }

      // Clear stored tokens
      await redisClient.del(`token:access:${userId}`);
      await redisClient.del(`token:refresh:${userId}`);

      logger.info(`All tokens revoked for user: ${userId}`);
    } catch (error) {
      logger.warn('Failed to revoke user tokens:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Check if user has valid tokens stored in Redis
   */
  static async hasValidTokens(
    userId: string
  ): Promise<{ hasAccessToken: boolean; hasRefreshToken: boolean }> {
    try {
      const accessToken = await redisClient.get(`token:access:${userId}`);
      const refreshToken = await redisClient.get(`token:refresh:${userId}`);

      return {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      };
    } catch (error) {
      logger.warn('Failed to check user tokens in Redis:', error);
      return {
        hasAccessToken: false,
        hasRefreshToken: false,
      };
    }
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(
    userId: string | null,
    action: string,
    resource: string,
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: action as any, // Type assertion for enum
          resource,
          resourceId,
          oldValues: oldValues || null,
          newValues: newValues || null,
          metadata: metadata || null,
          ipAddress: '127.0.0.1', // TODO: Get from request
          userAgent: 'AuthService', // TODO: Get from request
        },
      });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
}
