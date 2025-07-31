import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationService } from '../services/notificationService';
import { ApiResponseUtil } from '../utils/response';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';

export class NotificationController {
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
