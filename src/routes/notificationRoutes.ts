import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { requireAdmin, requireAuth } from '../middleware/auth';
import {
  validateCreateNotification,
  validateGetNotification,
  validateGetNotifications,
  validateSendSystemNotification,
} from '../validators/notificationValidators';
import { rateLimit } from 'express-rate-limit';

const router = Router();

/**
 * Rate limiting for notification operations
 */
const notificationReadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Maximum 200 read operations per 15 minutes
  message: {
    success: false,
    message: 'Too many notification requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const notificationWriteLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Maximum 50 write operations per 15 minutes
  message: {
    success: false,
    message: 'Too many notification write attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminNotificationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Maximum 10 admin operations per hour
  message: {
    success: false,
    message: 'Too many admin notification attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const systemNotificationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Maximum 5 system notifications per hour
  message: {
    success: false,
    message: 'Too many system notification attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Advanced notification management operations
 */

/**
 * GET /notifications/me
 * Get current user's notifications with filtering and pagination
 */
router.get(
  '/me',
  notificationReadLimit,
  ...requireAuth(),
  validateGetNotifications,
  NotificationController.getMyNotifications
);

/**
 * POST /notifications
 * Create a new notification (Admin only)
 */
router.post(
  '/',
  adminNotificationLimit,
  ...requireAdmin(),
  validateCreateNotification,
  NotificationController.createNotification
);

/**
 * GET /notifications/me/stats
 * Get notification statistics for current user
 * Must be before /:id route to avoid conflicts
 */
router.get(
  '/me/stats',
  notificationReadLimit,
  ...requireAuth(),
  NotificationController.getNotificationStats
);

/**
 * PUT /notifications/me/read-all
 * Mark all notifications as read for current user
 * Must be before /:id routes to avoid conflicts
 */
router.put(
  '/me/read-all',
  notificationWriteLimit,
  ...requireAuth(),
  NotificationController.markAllAsRead
);

/**
 * POST /notifications/system
 * Send system-wide notification (Admin only)
 * Must be before /:id routes to avoid conflicts
 */
router.post(
  '/system',
  systemNotificationLimit,
  ...requireAdmin(),
  validateSendSystemNotification,
  NotificationController.sendSystemNotification
);

/**
 * POST /notifications/cleanup
 * Clean up expired notifications (Admin only)
 * Must be before /:id routes to avoid conflicts
 */
router.post(
  '/cleanup',
  adminNotificationLimit,
  ...requireAdmin(),
  NotificationController.cleanupExpired
);

/**
 * PUT /notifications/:id/read
 * Mark specific notification as read
 */
router.put(
  '/:id/read',
  notificationWriteLimit,
  ...requireAuth(),
  validateGetNotification,
  NotificationController.markAsRead
);

/**
 * DELETE /notifications/:id
 * Delete specific notification
 */
router.delete(
  '/:id',
  notificationWriteLimit,
  ...requireAuth(),
  validateGetNotification,
  NotificationController.deleteNotification
);

export default router; 