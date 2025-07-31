import { z } from 'zod';
import { TransactionType, TransactionStatus } from '@prisma/client';

// Request validation schemas
export const createTransactionSchema = z.object({
  body: z.object({
    fromAccountId: z
      .string()
      .min(1, 'From account ID is required')
      .cuid('From account ID must be a valid CUID'),
    toAccountId: z
      .string()
      .min(1, 'To account ID is required')
      .cuid('To account ID must be a valid CUID'),
    amount: z
      .number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount cannot exceed $1,000,000')
      .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    reference: z
      .string()
      .max(100, 'Reference cannot exceed 100 characters')
      .optional(),
    type: z
      .nativeEnum(TransactionType, {
        errorMap: () => ({ message: 'Invalid transaction type' }),
      })
      .optional()
      .default(TransactionType.TRANSFER),
    scheduledFor: z
      .string()
      .datetime({ message: 'Scheduled date must be a valid ISO datetime' })
      .optional()
      .transform((str) => str ? new Date(str) : undefined),
  }),
});

export const validateTransactionSchema = z.object({
  body: z.object({
    fromAccountId: z
      .string()
      .min(1, 'From account ID is required')
      .cuid('From account ID must be a valid CUID'),
    toAccountId: z
      .string()
      .min(1, 'To account ID is required')
      .cuid('To account ID must be a valid CUID'),
    amount: z
      .number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount cannot exceed $1,000,000')
      .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    reference: z
      .string()
      .max(100, 'Reference cannot exceed 100 characters')
      .optional(),
    type: z
      .nativeEnum(TransactionType, {
        errorMap: () => ({ message: 'Invalid transaction type' }),
      })
      .optional(),
  }),
});

export const getTransactionSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Transaction ID is required')
      .cuid('Transaction ID must be a valid CUID'),
  }),
});

export const reverseTransactionSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Transaction ID is required')
      .cuid('Transaction ID must be a valid CUID'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
  }),
});

export const getTransactionsQuerySchema = z.object({
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
    status: z
      .string()
      .optional()
      .refine((val) => !val || Object.values(TransactionStatus).includes(val as TransactionStatus), {
        message: 'Invalid transaction status',
      })
      .transform((val) => val as TransactionStatus | undefined),
    type: z
      .string()
      .optional()
      .refine((val) => !val || Object.values(TransactionType).includes(val as TransactionType), {
        message: 'Invalid transaction type',
      })
      .transform((val) => val as TransactionType | undefined),
    startDate: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO datetime' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'End date must be a valid ISO datetime' })
      .optional(),
    minAmount: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .refine((val) => val === undefined || val >= 0, 'Minimum amount must be non-negative'),
    maxAmount: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .refine((val) => val === undefined || val >= 0, 'Maximum amount must be non-negative'),
    search: z
      .string()
      .max(100, 'Search term cannot exceed 100 characters')
      .optional(),
    sortBy: z
      .string()
      .optional()
      .default('createdAt')
      .refine((val) => ['createdAt', 'updatedAt', 'amount', 'status', 'type'].includes(val), {
        message: 'Invalid sort field',
      }),
    sortOrder: z
      .string()
      .optional()
      .default('desc')
      .refine((val) => ['asc', 'desc'].includes(val), {
        message: 'Sort order must be asc or desc',
      })
      .transform((val) => val as 'asc' | 'desc'),
  }).refine((data) => {
    // Validate date range
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Start date must be before or equal to end date',
  }).refine((data) => {
    // Validate amount range
    if (data.minAmount !== undefined && data.maxAmount !== undefined) {
      return data.minAmount <= data.maxAmount;
    }
    return true;
  }, {
    message: 'Minimum amount must be less than or equal to maximum amount',
  }),
});

// Custom validation for same account check
export const validateDifferentAccounts = (fromAccountId: string, toAccountId: string): boolean => {
  return fromAccountId !== toAccountId;
};

// Custom validation for future scheduled dates
export const validateScheduledDate = (scheduledFor?: Date): boolean => {
  if (!scheduledFor) return true;
  return scheduledFor > new Date();
};

// Validation middleware factory
export const validateTransactionRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Merge validated data back to request
      Object.assign(req, result);
      
      // Additional custom validations for transaction creation
      if (result.body && 'fromAccountId' in result.body && 'toAccountId' in result.body) {
        if (!validateDifferentAccounts(result.body.fromAccountId, result.body.toAccountId)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot transfer to the same account',
            timestamp: new Date().toISOString(),
          });
        }

        if (result.body.scheduledFor && !validateScheduledDate(result.body.scheduledFor)) {
          return res.status(400).json({
            success: false,
            message: 'Scheduled date must be in the future',
            timestamp: new Date().toISOString(),
          });
        }
      }

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
export const validateCreateTransaction = validateTransactionRequest(createTransactionSchema);
export const validateValidateTransaction = validateTransactionRequest(validateTransactionSchema);
export const validateGetTransaction = validateTransactionRequest(getTransactionSchema);
export const validateReverseTransaction = validateTransactionRequest(reverseTransactionSchema);
export const validateGetTransactions = validateTransactionRequest(getTransactionsQuerySchema); 