import bcrypt from 'bcryptjs';
import { AuditAction, User, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  UserResponse,
  UserListQuery,
  UserStats,
  BulkUserOperation,
  UserActivityLog,
  UserActivityQuery,
} from '../types/user';
import { PaginatedResponse, PaginationMeta } from '../types/api';

export class UserService {
  /**
   * Get all users with pagination and filters (Admin only)
   */
  static async getUsers(
    query: UserListQuery,
    requestingUserId: string
  ): Promise<PaginatedResponse<UserResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      // Ensure page and limit are numbers
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get users with account information
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            account: {
              select: {
                id: true,
                balance: true,
                currency: true,
                isActive: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.user.count({ where }),
      ]);

      const userResponses: UserResponse[] = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        account: user.account
          ? {
              id: user.account.id,
              balance: Number(user.account.balance),
              currency: user.account.currency,
              isActive: user.account.isActive,
            }
          : undefined,
      }));

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      // Log audit event
      await this.logAuditEvent(requestingUserId, 'READ', 'User', 'multiple', null, {
        query,
        resultCount: users.length,
      });

      logger.info(`Admin ${requestingUserId} retrieved ${users.length} users`);

      return {
        success: true,
        data: userResponses,
        meta,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string, requestingUserId: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          account: {
            select: {
              id: true,
              balance: true,
              currency: true,
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Log audit event
      await this.logAuditEvent(requestingUserId, 'READ', 'User', userId);

      logger.info(`User ${userId} retrieved by ${requestingUserId}`);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        account: user.account
          ? {
              id: user.account.id,
              balance: Number(user.account.balance),
              currency: user.account.currency,
              isActive: user.account.isActive,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  /**
   * Create new user (Admin only)
   */
  static async createUser(
    data: CreateUserRequest,
    requestingUserId: string
  ): Promise<UserResponse> {
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

      // Create user first
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          role: data.role || UserRole.USER,
        },
      });

      // Create account for the user
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          balance: 0.0,
          currency: 'USD',
        },
      });

      // Log audit event
      await this.logAuditEvent(requestingUserId, 'CREATE', 'User', user.id, null, {
        email: user.email,
        role: user.role,
        createdByAdmin: true,
      });

      logger.info(`User created by admin ${requestingUserId}: ${user.email}`);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        account: {
          id: account.id,
          balance: Number(account.balance),
          currency: account.currency,
          isActive: account.isActive,
        },
      };
    } catch (error) {
      logger.error('Create user error:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(
    userId: string,
    data: UpdateUserRequest,
    requestingUserId: string
  ): Promise<UserResponse> {
    try {
      // Get current user data for audit
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Check email uniqueness if email is being updated
      if (data.email && data.email !== currentUser.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          throw new Error('Email is already in use by another user');
        }
      }

      // Build update data object
      const updateData: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'isActive'>> = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          account: {
            select: {
              id: true,
              balance: true,
              currency: true,
              isActive: true,
            },
          },
        },
      });

      // Log audit event
      await this.logAuditEvent(
        requestingUserId,
        'UPDATE',
        'User',
        userId,
        {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
          isActive: currentUser.isActive,
        },
        data
      );

      logger.info(`User ${userId} updated by ${requestingUserId}`);

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
        account: updatedUser.account
          ? {
              id: updatedUser.account.id,
              balance: Number(updatedUser.account.balance),
              currency: updatedUser.account.currency,
              isActive: updatedUser.account.isActive,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  /**
   * Update user role (Admin only)
   */
  static async updateUserRole(
    userId: string,
    data: UpdateUserRoleRequest,
    requestingUserId: string
  ): Promise<UserResponse> {
    try {
      // Prevent self-role changes
      if (userId === requestingUserId) {
        throw new Error('You cannot change your own role');
      }

      // Get current user data
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          role: data.role,
        },
        include: {
          account: {
            select: {
              id: true,
              balance: true,
              currency: true,
              isActive: true,
            },
          },
        },
      });

      // Log audit event
      await this.logAuditEvent(
        requestingUserId,
        'UPDATE',
        'User',
        userId,
        { role: currentUser.role },
        { role: data.role }
      );

      logger.info(
        `User ${userId} role changed from ${currentUser.role} to ${data.role} by admin ${requestingUserId}`
      );

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
        account: updatedUser.account
          ? {
              id: updatedUser.account.id,
              balance: Number(updatedUser.account.balance),
              currency: updatedUser.account.currency,
              isActive: updatedUser.account.isActive,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Update user role error:', error);
      throw error;
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    try {
      // Prevent self-deletion
      if (userId === requestingUserId) {
        throw new Error('You cannot delete your own account');
      }

      // Get user data before deletion
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { account: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has a non-zero balance
      if (user.account && Number(user.account.balance) !== 0) {
        throw new Error(
          'Cannot delete user with non-zero account balance. Please transfer funds first.'
        );
      }

      // Delete user and related data in transaction
      await prisma.$transaction(async tx => {
        // Delete audit logs
        await tx.auditLog.deleteMany({
          where: { userId },
        });

        // Delete account
        if (user.account) {
          await tx.account.delete({
            where: { id: user.account.id },
          });
        }

        // Delete user
        await tx.user.delete({
          where: { id: userId },
        });
      });

      // Log audit event (this will be the last one for this user)
      await this.logAuditEvent(
        requestingUserId,
        'DELETE',
        'User',
        userId,
        {
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        null
      );

      logger.info(`User ${userId} (${user.email}) deleted by admin ${requestingUserId}`);
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }

  /**
   * Get user statistics (Admin only)
   */
  static async getUserStats(requestingUserId: string): Promise<UserStats> {
    try {
      const [totalResult, groupedStats] = await Promise.all([
        prisma.user.aggregate({
          _count: {
            _all: true,
          },
        }),
        prisma.user.groupBy({
          by: ['isActive', 'role'],
          _count: { _all: true },
        }),
      ]);

      // Initialize counters
      let active = 0;
      let inactive = 0;
      let adminCount = 0;
      let userCount = 0;

      // Process grouped results
      groupedStats.forEach(({ isActive, role, _count }) => {
        if (isActive) {
          active += _count._all;
        } else {
          inactive += _count._all;
        }

        if (role === UserRole.ADMIN) {
          adminCount += _count._all;
        } else if (role === UserRole.USER) {
          userCount += _count._all;
        }
      });

      // Log audit event
      await this.logAuditEvent(requestingUserId, 'READ', 'UserStats', 'system');

      return {
        total: totalResult._count._all,
        active,
        inactive,
        byRole: {
          USER: userCount,
          ADMIN: adminCount,
        },
      };
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }

  /**
   * Bulk user operations (Admin only)
   */
  static async bulkUserOperation(
    operation: BulkUserOperation,
    requestingUserId: string
  ): Promise<{ success: number; failed: string[] }> {
    try {
      const { userIds, action } = operation;
      const results = { success: 0, failed: [] as string[] };

      for (const userId of userIds) {
        try {
          // Prevent operations on self
          if (userId === requestingUserId) {
            results.failed.push(`${userId}: Cannot perform operation on your own account`);
            continue;
          }

          let userToDeleteBalance: number | null = null;

          switch (action) {
            case 'activate':
              await prisma.user.update({
                where: { id: userId },
                data: { isActive: true },
              });
              break;

            case 'deactivate':
              await prisma.user.update({
                where: { id: userId },
                data: { isActive: false },
              });
              break;

            case 'delete':
              // Check balance before deletion
              const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { account: true },
              });

              if (user?.account && Number(user.account.balance) !== 0) {
                results.failed.push(`${userId}: Cannot delete user with non-zero balance`);
                continue;
              }

              // Store balance for audit log before deletion
              userToDeleteBalance = user?.account ? Number(user.account.balance) : 0;

              await this.deleteUser(userId, requestingUserId);
              break;
          }

          results.success++;

          // Log individual audit event
          await this.logAuditEvent(
            requestingUserId,
            `BULK_${action.toUpperCase()}` as AuditAction,
            'User',
            userId,
            null,
            null,
            {
              action,
              ...(action === 'delete' && { balance: userToDeleteBalance }),
            }
          );
        } catch (error) {
          results.failed.push(`${userId}: ${(error as Error).message}`);
        }
      }

      // Log bulk operation audit event
      await this.logAuditEvent(
        requestingUserId,
        AuditAction.BULK_OPERATION,
        'User',
        'multiple',
        null,
        null,
        {
          action,
          totalUsers: userIds.length,
          successful: results.success,
          failed: results.failed.length,
          failedDetails: results.failed,
          timestamp: new Date().toISOString(),
        }
      );

      logger.info(
        `Bulk ${action} operation by admin ${requestingUserId}: ${results.success} success, ${results.failed.length} failed`
      );

      return results;
    } catch (error) {
      logger.error('Bulk user operation error:', error);
      throw error;
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserActivity(
    userId: string,
    query: UserActivityQuery,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<PaginatedResponse<UserActivityLog>> {
    try {
      // Check permissions
      if (requestingUserRole !== UserRole.ADMIN && userId !== requestingUserId) {
        throw new Error('You can only access your own activity logs');
      }

      const { page = 1, limit = 20, action, resource, from, to, sortOrder = 'desc' } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (action) {
        where.action = { contains: action, mode: 'insensitive' };
      }

      if (resource) {
        where.resource = { contains: resource, mode: 'insensitive' };
      }

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: sortOrder },
        }),
        prisma.auditLog.count({ where }),
      ]);

      const activities: UserActivityLog[] = logs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        createdAt: log.createdAt.toISOString(),
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        metadata: log.metadata,
      }));

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return {
        success: true,
        data: activities,
        meta,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get user activity error:', error);
      throw error;
    }
  }

  /**
   * Check email availability
   */
  static async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      return { available: !existingUser };
    } catch (error) {
      logger.error('Check email availability error:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(
    userId: string | null,
    action: AuditAction,
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
          action: action as any,
          resource,
          resourceId,
          oldValues: oldValues || null,
          newValues: newValues || null,
          metadata: metadata || null,
          ipAddress: '127.0.0.1', // TODO: Get from request context
          userAgent: 'UserService', // TODO: Get from request context
        },
      });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
}
