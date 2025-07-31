import { z } from 'zod';
import { NotificationType, UserRole } from '@prisma/client';
import { NotificationPriority, NotificationChannel } from '../services/notificationService';

// Request validation schemas
export const createNotificationSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .optional()
      .refine((val) => !val || val.length > 0, 'User ID cannot be empty'),
    accountId: z
      .string()
      .optional()
      .refine((val) => !val || val.length > 0, 'Account ID cannot be empty'),
    transactionId: z
      .string()
      .optional()
      .refine((val) => !val || val.length > 0, 'Transaction ID cannot be empty'),
    type: z
      .nativeEnum(NotificationType, {
        errorMap: () => ({ message: 'Invalid notification type' }),
      }),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters'),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(1000, 'Message cannot exceed 1000 characters'),
    priority: z
      .nativeEnum(NotificationPriority, {
        errorMap: () => ({ message: 'Invalid notification priority' }),
      })
      .optional(),
    channel: z
      .nativeEnum(NotificationChannel, {
        errorMap: () => ({ message: 'Invalid notification channel' }),
      })
      .optional(),
    metadata: z
      .record(z.any())
      .optional(),
    scheduledFor: z
      .string()
      .datetime({ message: 'Scheduled date must be a valid ISO datetime' })
      .optional()
      .transform((str) => str ? new Date(str) : undefined),
    expiresAt: z
      .string()
      .datetime({ message: 'Expiration date must be a valid ISO datetime' })
      .optional()
      .transform((str) => str ? new Date(str) : undefined),
  }).refine((data) => {
    // Validate scheduled date is in the future
    if (data.scheduledFor && data.scheduledFor <= new Date()) {
      return false;
    }
    return true;
  }, {
    message: 'Scheduled date must be in the future',
    path: ['scheduledFor']
  }).refine((data) => {
    // Validate expiration date is after scheduled date
    if (data.scheduledFor && data.expiresAt && data.expiresAt <= data.scheduledFor) {
      return false;
    }
    return true;
  }, {
    message: 'Expiration date must be after scheduled date',
    path: ['expiresAt']
  }),
});

export const getNotificationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Notification ID is required')
      .cuid('Notification ID must be a valid CUID'),
  }),
});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: z
      .string()
      .optional()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    unreadOnly: z
      .string()
      .optional()
      .transform((val) => val === 'true')
      .default('false'),
    type: z
      .string()
      .optional()
      .refine((val) => !val || Object.values(NotificationType).includes(val as NotificationType), {
        message: 'Invalid notification type',
      })
      .transform((val) => val as NotificationType | undefined),
    priority: z
      .string()
      .optional()
      .refine((val) => !val || Object.values(NotificationPriority).includes(val as NotificationPriority), {
        message: 'Invalid notification priority',
      })
      .transform((val) => val as NotificationPriority | undefined),
    startDate: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO datetime' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'End date must be a valid ISO datetime' })
      .optional(),
  }).refine((data) => {
    // Validate date range
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Start date must be before or equal to end date',
  }),
});

export const sendSystemNotificationSchema = z.object({
  body: z.object({
    type: z
      .nativeEnum(NotificationType, {
        errorMap: () => ({ message: 'Invalid notification type' }),
      }),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters'),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(1000, 'Message cannot exceed 1000 characters'),
    metadata: z
      .record(z.any())
      .optional(),
    expiresAt: z
      .string()
      .datetime({ message: 'Expiration date must be a valid ISO datetime' })
      .optional(),
    userRole: z
      .nativeEnum(UserRole, {
        errorMap: () => ({ message: 'Invalid user role' }),
      })
      .optional(),
  }),
});

// Custom validation functions
export const validateNotificationAccess = (notificationUserId: string, requestingUserId: string): boolean => {
  return notificationUserId === requestingUserId;
};

export const validateAdminAccess = (userRole: string): boolean => {
  return userRole === 'ADMIN';
};

// Validation middleware factory
export const validateNotificationRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Merge validated data back to request
      Object.assign(req, result);

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: formattedErrors,
          timestamp: new Date().toISOString(),
        });
      }

      next(error);
    }
  };
};

// Export validation middleware functions
export const validateCreateNotification = validateNotificationRequest(createNotificationSchema);
export const validateGetNotification = validateNotificationRequest(getNotificationSchema);
export const validateGetNotifications = validateNotificationRequest(getNotificationsQuerySchema);
export const validateSendSystemNotification = validateNotificationRequest(sendSystemNotificationSchema); 