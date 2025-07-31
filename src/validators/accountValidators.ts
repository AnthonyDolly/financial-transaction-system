import { z } from 'zod';

/**
 * Common validation rules
 */
const amountSchema = z
  .number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  })
  .positive('Amount must be greater than 0')
  .max(1000000, 'Amount cannot exceed $1,000,000')
  .refine((val) => Number.isFinite(val) && Number((val).toFixed(2)) === val, {
    message: 'Amount must have at most 2 decimal places',
  });

const accountIdSchema = z
  .string({
    required_error: 'Account ID is required',
    invalid_type_error: 'Account ID must be a string',
  })
  .cuid('Invalid account ID format');

const descriptionSchema = z
  .string()
  .min(1, 'Description cannot be empty')
  .max(255, 'Description cannot exceed 255 characters')
  .trim()
  .optional();

const referenceSchema = z
  .string()
  .min(1, 'Reference cannot be empty')
  .max(100, 'Reference cannot exceed 100 characters')
  .trim()
  .optional();

/**
 * Get account by ID validation
 */
export const getAccountByIdSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
});

/**
 * Transfer money validation
 */
export const transferSchema = z.object({
  body: z.object({
    fromAccountId: accountIdSchema,
    toAccountId: accountIdSchema,
    amount: amountSchema,
    description: descriptionSchema,
    reference: referenceSchema,
  }).refine(
    (data) => data.fromAccountId !== data.toAccountId,
    {
      message: 'Cannot transfer to the same account',
      path: ['toAccountId'],
    }
  ),
});

/**
 * Deposit money validation
 */
export const depositSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  body: z.object({
    amount: amountSchema,
    description: descriptionSchema,
    reference: referenceSchema,
    source: z.enum(['bank_transfer', 'cash', 'check', 'online', 'other'], {
      required_error: 'Source is required',
      invalid_type_error: 'Invalid source type',
    }),
  }),
});

/**
 * Withdraw money validation
 */
export const withdrawSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  body: z.object({
    amount: amountSchema,
    description: descriptionSchema,
    reference: referenceSchema,
    method: z.enum(['atm', 'bank_counter', 'online', 'check', 'other'], {
      required_error: 'Method is required',
      invalid_type_error: 'Invalid withdrawal method',
    }),
  }),
});

/**
 * Account statement query validation
 */
export const getStatementSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional(),
    type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
    minAmount: z.coerce.number().min(0, 'Minimum amount cannot be negative').optional(),
    maxAmount: z.coerce.number().min(0, 'Maximum amount cannot be negative').optional(),
    search: z.string().min(1, 'Search term cannot be empty').optional(),
    sortBy: z.enum(['createdAt', 'amount', 'description']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }).refine(
    (data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  ).refine(
    (data) => !data.minAmount || !data.maxAmount || data.minAmount <= data.maxAmount,
    {
      message: 'Minimum amount must be less than or equal to maximum amount',
      path: ['maxAmount'],
    }
  ),
});

/**
 * Freeze account validation
 */
export const freezeAccountSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  body: z.object({
    reason: z.string({
      required_error: 'Reason is required',
      invalid_type_error: 'Reason must be a string',
    }).min(10, 'Reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters'),
    duration: z.number().int().min(1).max(365).optional(),
    notifyUser: z.boolean().optional().default(true),
  }),
});

/**
 * Unfreeze account validation
 */
export const unfreezeAccountSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  body: z.object({
    reason: z.string({
      required_error: 'Reason is required',
      invalid_type_error: 'Reason must be a string',
    }).min(10, 'Reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters'),
    notifyUser: z.boolean().optional().default(true),
  }),
});

/**
 * Set account limits validation
 */
export const setAccountLimitsSchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  body: z.object({
    limits: z.object({
      dailyTransferLimit: z.number().min(0).max(1000000).optional(),
      monthlyTransferLimit: z.number().min(0).max(10000000).optional(),
      singleTransactionLimit: z.number().min(0).max(1000000).optional(),
      dailyWithdrawalLimit: z.number().min(0).max(100000).optional(),
      monthlyWithdrawalLimit: z.number().min(0).max(1000000).optional(),
    }).refine(
      (limits) => Object.keys(limits).length > 0,
      {
        message: 'At least one limit must be provided',
      }
    ),
    reason: z.string().min(10).max(500).optional(),
  }),
});

/**
 * Bulk transfer validation
 */
export const bulkTransferSchema = z.object({
  body: z.object({
    fromAccountId: accountIdSchema,
    transfers: z.array(
      z.object({
        toAccountId: accountIdSchema,
        amount: amountSchema,
        description: descriptionSchema,
        reference: referenceSchema,
      })
    ).min(1, 'At least one transfer is required').max(50, 'Cannot process more than 50 transfers at once'),
    validateOnly: z.boolean().optional().default(false),
  }).refine(
    (data) => {
      // Ensure no duplicate toAccountIds
      const toAccountIds = data.transfers.map(t => t.toAccountId);
      const uniqueIds = new Set(toAccountIds);
      return uniqueIds.size === toAccountIds.length;
    },
    {
      message: 'Duplicate destination accounts are not allowed',
      path: ['transfers'],
    }
  ).refine(
    (data) => {
      // Ensure fromAccountId is not in any toAccountId
      return !data.transfers.some(t => t.toAccountId === data.fromAccountId);
    },
    {
      message: 'Cannot transfer to the source account',
      path: ['transfers'],
    }
  ),
});

/**
 * Account verification validation
 */
export const accountVerificationSchema = z.object({
  body: z.object({
    accountId: accountIdSchema,
    verificationType: z.enum(['identity', 'address', 'income', 'other'], {
      required_error: 'Verification type is required',
      invalid_type_error: 'Invalid verification type',
    }),
    documents: z.array(z.string().url('Invalid document URL')).min(1, 'At least one document is required'),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),
});

/**
 * Get account activity validation
 */
export const getAccountActivitySchema = z.object({
  params: z.object({
    id: accountIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    action: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

/**
 * Deposit to my account validation
 */
export const depositToMyAccountSchema = z.object({
  body: z.object({
    amount: amountSchema,
    description: descriptionSchema,
    reference: referenceSchema,
    source: z.enum(['bank_transfer', 'cash', 'check', 'online', 'other'], {
      required_error: 'Source is required',
      invalid_type_error: 'Invalid source type',
    }),
  }),
});

/**
 * Withdraw from my account validation
 */
export const withdrawFromMyAccountSchema = z.object({
  body: z.object({
    amount: amountSchema,
    description: descriptionSchema,
    reference: referenceSchema,
    method: z.enum(['atm', 'bank_counter', 'online', 'check', 'other'], {
      required_error: 'Method is required',
      invalid_type_error: 'Invalid withdrawal method',
    }),
  }),
});

/**
 * Get my account statement query validation
 */
export const getMyStatementSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional(),
    minAmount: z.coerce.number().min(0, 'Minimum amount cannot be negative').optional(),
    maxAmount: z.coerce.number().min(0, 'Maximum amount cannot be negative').optional(),
    search: z.string().min(1, 'Search term cannot be empty').optional(),
    sortBy: z.enum(['createdAt', 'amount', 'description']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }).refine(
    (data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  ).refine(
    (data) => !data.minAmount || !data.maxAmount || data.minAmount <= data.maxAmount,
    {
      message: 'Minimum amount must be less than or equal to maximum amount',
      path: ['maxAmount'],
    }
  ),
});

/**
 * Export types for TypeScript
 */
export type TransferBody = z.infer<typeof transferSchema>['body'];
export type DepositBody = z.infer<typeof depositSchema>['body'];
export type WithdrawBody = z.infer<typeof withdrawSchema>['body'];
export type GetStatementQuery = z.infer<typeof getStatementSchema>['query'];
export type FreezeAccountBody = z.infer<typeof freezeAccountSchema>['body'];
export type UnfreezeAccountBody = z.infer<typeof unfreezeAccountSchema>['body'];
export type SetAccountLimitsBody = z.infer<typeof setAccountLimitsSchema>['body'];
export type BulkTransferBody = z.infer<typeof bulkTransferSchema>['body'];
export type AccountVerificationBody = z.infer<typeof accountVerificationSchema>['body'];
export type GetAccountActivityQuery = z.infer<typeof getAccountActivitySchema>['query'];

// My account endpoint types
export type DepositToMyAccountBody = z.infer<typeof depositToMyAccountSchema>['body'];
export type WithdrawFromMyAccountBody = z.infer<typeof withdrawFromMyAccountSchema>['body'];
export type GetMyStatementQuery = z.infer<typeof getMyStatementSchema>['query']; 