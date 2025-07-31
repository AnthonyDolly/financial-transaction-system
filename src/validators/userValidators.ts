import { z } from 'zod';
import { UserRole } from '@prisma/client';

/**
 * Common validation rules
 */
const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  })
  .email('Please provide a valid email address')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  );

const nameSchema = z
  .string()
  .min(1, 'Name must not be empty')
  .max(50, 'Name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
  .trim()
  .optional();

const roleSchema = z.nativeEnum(UserRole, {
  required_error: 'Role is required',
  invalid_type_error: 'Role must be either USER or ADMIN',
});

/**
 * Create user request validation (Admin only)
 */
export const createUserSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    role: roleSchema.optional().default(UserRole.USER),
  }),
});

/**
 * Update user request validation
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
  body: z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema.optional(),
    isActive: z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field must be provided for update',
    }
  ),
});

/**
 * Update user role request validation (Admin only)
 */
export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
  body: z.object({
    role: roleSchema,
  }),
});

/**
 * Get user by ID validation
 */
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
});

/**
 * User list query validation
 */
export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    search: z.string().min(1).optional(),
    role: roleSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Bulk user operations validation (Admin only)
 */
export const bulkUserOperationSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().cuid('Invalid user ID format')).min(1, 'At least one user ID is required'),
    action: z.enum(['activate', 'deactivate', 'delete'], {
      required_error: 'Action is required',
      invalid_type_error: 'Action must be one of: activate, deactivate, delete',
    }),
  }).refine(
    (data) => data.userIds.length <= 50,
    {
      message: 'Cannot perform bulk operations on more than 50 users at once',
    }
  ),
});

/**
 * Delete user validation (Admin only)
 */
export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
});

/**
 * User activity logs query validation
 */
export const getUserActivitySchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    action: z.string().optional(),
    resource: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Email uniqueness validation
 */
export const emailValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Export types for TypeScript
 */
export type CreateUserBody = z.infer<typeof createUserSchema>['body'];
export type UpdateUserBody = z.infer<typeof updateUserSchema>['body'];
export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>['query'];
export type BulkUserOperationBody = z.infer<typeof bulkUserOperationSchema>['body'];
export type GetUserActivityQuery = z.infer<typeof getUserActivitySchema>['query']; 