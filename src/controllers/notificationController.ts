import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  NotificationService,
  NotificationRequest,
  NotificationPriority,
  NotificationChannel,
} from '../services/notificationService';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';
import { NotificationType, UserRole } from '@prisma/client';
import { redisClient } from '../utils/redisClient';

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         accountId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         transactionId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *           example: "TRANSACTION_COMPLETED"
 *         title:
 *           type: string
 *           example: "Transaction Completed"
 *         message:
 *           type: string
 *           example: "Your transaction has been processed successfully"
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *           example: "MEDIUM"
 *         channel:
 *           type: string
 *           enum: [IN_APP, EMAIL, SMS, PUSH]
 *           example: "IN_APP"
 *         metadata:
 *           type: object
 *           example: {"amount": "100.00", "reference": "TXN-001"}
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *
 *     NotificationResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         accountId:
 *           type: string
 *         transactionId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         channel:
 *           type: string
 *           enum: [IN_APP, EMAIL, SMS, PUSH]
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *
 *     NotificationStats:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *         unread:
 *           type: number
 *         byType:
 *           type: object
 *           additionalProperties:
 *             type: number
 *         byPriority:
 *           type: object
 *           additionalProperties:
 *             type: number
 *
 *     SystemNotificationRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - message
 *       properties:
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         metadata:
 *           type: object
 *         userRole:
 *           type: string
 *           enum: [USER, ADMIN]
 *           description: Target specific user role (optional)
 */

export class NotificationController {
  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Get current user's notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         name: unreadOnly
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Get only unread notifications
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [LOW, MEDIUM, HIGH, URGENT]
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Notifications retrieved successfully
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
   *                         $ref: '#/components/schemas/NotificationResponse'
   */

  static getMyNotifications = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const cacheKey = `user:${req.user.id}:notifications:${JSON.stringify(req.query)}`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          ApiResponseUtil.paginated(
            res,
            parsed.data,
            parsed.meta,
            'Notifications retrieved successfully (cache)'
          );
          return;
        }
        const result = await NotificationService.getUserNotifications(req.user.id, req.query);
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 });
        ApiResponseUtil.paginated(
          res,
          result.data,
          result.meta,
          'Notifications retrieved successfully'
        );
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications:
   *   post:
   *     summary: Create a new notification (Admin only)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/NotificationRequest'
   *     responses:
   *       201:
   *         description: Notification created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/NotificationResponse'
   *       403:
   *         description: Admin access required
   */
  static createNotification = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (req.user.role !== 'ADMIN') {
        ApiResponseUtil.forbidden(res, 'Admin access required');
        return;
      }

      try {
        const notification = await NotificationService.createNotification(req.body);
        ApiResponseUtil.created(res, notification, 'Notification created successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.badRequest(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/{id}/read:
   *   put:
   *     summary: Mark notification as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification marked as read successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/NotificationResponse'
   *       404:
   *         description: Notification not found
   */
  static markAsRead = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Notification ID is required');
        return;
      }

      try {
        const notification = await NotificationService.markAsRead(id, req.user.id);
        ApiResponseUtil.success(res, notification, 'Notification marked as read successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message.includes('not found')) {
          ApiResponseUtil.notFound(res, 'Notification not found');
          return;
        }
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/read-all:
   *   put:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All notifications marked as read successfully
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
   *                         count:
   *                           type: number
   *                           description: Number of notifications marked as read
   */
  static markAllAsRead = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await NotificationService.markAllAsRead(req.user.id);
        ApiResponseUtil.success(res, result, 'All notifications marked as read successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/{id}:
   *   delete:
   *     summary: Delete a notification
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notification deleted successfully
   *       404:
   *         description: Notification not found
   */
  static deleteNotification = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Notification ID is required');
        return;
      }

      try {
        await NotificationService.deleteNotification(id, req.user.id);
        ApiResponseUtil.success(res, null, 'Notification deleted successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message.includes('not found')) {
          ApiResponseUtil.notFound(res, 'Notification not found');
          return;
        }
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/stats:
   *   get:
   *     summary: Get notification statistics
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Notification statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/NotificationStats'
   */
  static getNotificationStats = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const stats = await NotificationService.getNotificationStats(req.user.id);
        ApiResponseUtil.success(res, stats, 'Notification statistics retrieved successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/system:
   *   post:
   *     summary: Send system-wide notification (Admin only)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SystemNotificationRequest'
   *     responses:
   *       200:
   *         description: System notification sent successfully
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
   *                         count:
   *                           type: number
   *                           description: Number of users who received the notification
   *       403:
   *         description: Admin access required
   */
  static sendSystemNotification = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (req.user.role !== 'ADMIN') {
        ApiResponseUtil.forbidden(res, 'Admin access required');
        return;
      }

      const { type, title, message, metadata, userRole } = req.body;

      if (!type || !title || !message) {
        ApiResponseUtil.badRequest(res, 'Type, title, and message are required');
        return;
      }

      try {
        const result = await NotificationService.sendSystemNotification(
          type,
          title,
          message,
          metadata,
          userRole
        );
        ApiResponseUtil.success(res, result, 'System notification sent successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.badRequest(res, err.message);
        return;
      }
    }
  );

  /**
   * @swagger
   * /notifications/cleanup:
   *   post:
   *     summary: Clean up expired notifications (Admin only)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Expired notifications cleaned up successfully
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
   *                         deletedCount:
   *                           type: number
   *                           description: Number of expired notifications deleted
   *       403:
   *         description: Admin access required
   */
  static cleanupExpired = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (req.user.role !== 'ADMIN') {
        ApiResponseUtil.forbidden(res, 'Admin access required');
        return;
      }

      try {
        const result = await NotificationService.cleanupExpiredNotifications();
        ApiResponseUtil.success(res, result, 'Expired notifications cleaned up successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.serverError(res, err.message);
        return;
      }
    }
  );
}
