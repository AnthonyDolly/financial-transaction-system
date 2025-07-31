import { NotificationType, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { PaginatedResponse, PaginationMeta } from '../types/api';

export interface NotificationRequest {
  userId?: string;
  accountId?: string;
  transactionId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface NotificationResponse {
  id: string;
  userId?: string;
  accountId?: string;
  transactionId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  transactionNotifications: boolean;
  securityNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH'
}

export class NotificationService {
  // Notification templates for different types
  private static templates: Map<NotificationType, NotificationTemplate> = new Map([
    [NotificationType.TRANSACTION_COMPLETED, {
      type: NotificationType.TRANSACTION_COMPLETED,
      title: 'Transaction Completed',
      message: 'Your transaction of ${amount} has been completed successfully.',
      priority: NotificationPriority.MEDIUM,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.TRANSACTION_FAILED, {
      type: NotificationType.TRANSACTION_FAILED,
      title: 'Transaction Failed',
      message: 'Your transaction of ${amount} has failed. Reason: ${reason}',
      priority: NotificationPriority.HIGH,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.LOW_BALANCE, {
      type: NotificationType.LOW_BALANCE,
      title: 'Low Balance Alert',
      message: 'Your account balance is low: ${balance}. Consider adding funds.',
      priority: NotificationPriority.MEDIUM,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.HIGH_BALANCE, {
      type: NotificationType.HIGH_BALANCE,
      title: 'High Balance Alert',
      message: 'Your account balance is unusually high: ${balance}. Consider investment options.',
      priority: NotificationPriority.LOW,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.SECURITY_ALERT, {
      type: NotificationType.SECURITY_ALERT,
      title: 'Security Alert',
      message: 'Suspicious activity detected on your account. Please review immediately.',
      priority: NotificationPriority.URGENT,
      channel: NotificationChannel.EMAIL
    }],
    [NotificationType.ACCOUNT_FROZEN, {
      type: NotificationType.ACCOUNT_FROZEN,
      title: 'Account Frozen',
      message: 'Your account has been temporarily frozen for security reasons. Contact support.',
      priority: NotificationPriority.URGENT,
      channel: NotificationChannel.EMAIL
    }],
    [NotificationType.ACCOUNT_UNFROZEN, {
      type: NotificationType.ACCOUNT_UNFROZEN,
      title: 'Account Unfrozen',
      message: 'Your account has been unfrozen and is now active.',
      priority: NotificationPriority.HIGH,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.LIMIT_REACHED, {
      type: NotificationType.LIMIT_REACHED,
      title: 'Transaction Limit Reached',
      message: 'You have reached your ${limitType} ${limitPeriod} limit of ${limit}.',
      priority: NotificationPriority.HIGH,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.SCHEDULED_PAYMENT, {
      type: NotificationType.SCHEDULED_PAYMENT,
      title: 'Scheduled Payment',
      message: 'Scheduled payment of ${amount} will be processed tomorrow.',
      priority: NotificationPriority.MEDIUM,
      channel: NotificationChannel.IN_APP
    }],
    [NotificationType.SYSTEM_MAINTENANCE, {
      type: NotificationType.SYSTEM_MAINTENANCE,
      title: 'System Maintenance',
      message: 'System maintenance scheduled for ${date}. Services may be temporarily unavailable.',
      priority: NotificationPriority.MEDIUM,
      channel: NotificationChannel.IN_APP
    }]
  ]);

  /**
   * Create a notification using templates
   */
  static async createNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      const template = this.templates.get(request.type);
      
      let title = request.title;
      let message = request.message;
      let priority = request.priority || NotificationPriority.MEDIUM;
      let channel = request.channel || NotificationChannel.IN_APP;

      // Use template if available and not overridden
      if (template && !request.title) {
        title = this.interpolateTemplate(template.title, request.metadata || {});
        message = this.interpolateTemplate(template.message, request.metadata || {});
        priority = request.priority || template.priority;
        channel = request.channel || template.channel;
      }

      const notification = await prisma.notification.create({
        data: {
          userId: request.userId || null,
          accountId: request.accountId || null,
          transactionId: request.transactionId || null,
          type: request.type,
          title,
          message,
          expiresAt: request.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          metadata: {
            priority,
            channel,
            scheduledFor: request.scheduledFor?.toISOString(),
            ...request.metadata
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Send notification through appropriate channel
      if (!request.scheduledFor || request.scheduledFor <= new Date()) {
        await this.sendNotification(notification, channel);
      }

      logger.info(`Notification created: ${notification.id} for user ${request.userId}`);

      return this.formatNotificationResponse(notification);
    } catch (error) {
      logger.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
      priority?: NotificationPriority;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<NotificationResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        priority,
        startDate,
        endDate
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        userId
      };

      if (unreadOnly) {
        where.isRead = false;
      }

      if (type) {
        where.type = type;
      }

      if (priority) {
        where.metadata = {
          path: ['priority'],
          equals: priority
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { isRead: 'asc' },
            { createdAt: 'desc' }
          ],
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.notification.count({ where })
      ]);

      const notificationResponses = notifications.map(this.formatNotificationResponse);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      return {
        success: true,
        data: notificationResponses,
        meta,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationResponse> {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId // Ensure user can only update their own notifications
        },
        data: {
          isRead: true,
          readAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return this.formatNotificationResponse(notification);
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      logger.info(`${result.count} notifications marked as read for user ${userId}`);
      return { count: result.count };
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId // Ensure user can only delete their own notifications
        }
      });

      logger.info(`Notification ${notificationId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Delete notification error:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const [total, unread, byType, byPriority] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { _all: true }
        }),
        prisma.notification.findMany({
          where: { userId },
          select: { metadata: true }
        })
      ]);

      // Process priority stats from metadata
      const priorityStats: Record<string, number> = {};
      byPriority.forEach(notification => {
        const metadata = notification.metadata as any;
        const priority = metadata?.priority as string || 'MEDIUM';
        priorityStats[priority] = (priorityStats[priority] || 0) + 1;
      });

      return {
        total,
        unread,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count._all;
          return acc;
        }, {} as Record<string, number>),
        byPriority: priorityStats
      };
    } catch (error) {
      logger.error('Get notification stats error:', error);
      throw error;
    }
  }

  /**
   * Send system-wide notifications (Admin only)
   */
  static async sendSystemNotification(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    userRole?: UserRole
  ): Promise<{ count: number }> {
    try {
      // Get users to notify
      const whereClause: any = { isActive: true };
      if (userRole) {
        whereClause.role = userRole;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      });

      // Create notifications for all users
      const notifications = users.map(user => ({
        userId: user.id,
        type,
        title,
        message,
        expiresAt: metadata && metadata.expiresAt ? new Date(metadata.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          priority: NotificationPriority.MEDIUM,
          channel: NotificationChannel.IN_APP,
          isSystem: true,
          ...metadata
        }
      }));

      const result = await prisma.notification.createMany({
        data: notifications
      });

      logger.info(`System notification sent to ${result.count} users`);
      return { count: result.count };
    } catch (error) {
      logger.error('Send system notification error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<{ deletedCount: number }> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            not: null,
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired notifications`);
      }

      return { deletedCount: result.count };
    } catch (error) {
      logger.error('Cleanup expired notifications error:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private static async sendNotification(notification: any, channel: NotificationChannel): Promise<void> {
    // In a real implementation, this would integrate with email, SMS, and push notification services
    switch (channel) {
      case NotificationChannel.EMAIL:
        logger.info(`[EMAIL] Would send notification ${notification.id} to ${notification.user?.email}`);
        break;
      case NotificationChannel.SMS:
        logger.info(`[SMS] Would send notification ${notification.id}`);
        break;
      case NotificationChannel.PUSH:
        logger.info(`[PUSH] Would send notification ${notification.id}`);
        break;
      case NotificationChannel.IN_APP:
      default:
        logger.info(`[IN_APP] Notification ${notification.id} ready for in-app display`);
        break;
    }
  }

  private static formatNotificationResponse(notification: any): NotificationResponse {
    const metadata = notification.metadata || {};
    
    return {
      id: notification.id,
      userId: notification.userId,
      accountId: notification.accountId,
      transactionId: notification.transactionId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: metadata.priority || NotificationPriority.MEDIUM,
      channel: metadata.channel || NotificationChannel.IN_APP,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString(),
      metadata: {
        scheduledFor: metadata.scheduledFor,
        expiresAt: metadata.expiresAt,
        isSystem: metadata.isSystem || false,
        ...metadata
      },
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      expiresAt: notification.expiresAt?.toISOString(),
      user: notification.user
    };
  }
} 