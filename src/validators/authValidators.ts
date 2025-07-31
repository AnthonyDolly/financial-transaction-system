import { z } from 'zod';

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

/**
 * Register request validation
 */
export const registerSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string({
        required_error: 'Password confirmation is required',
      }),
      firstName: nameSchema,
      lastName: nameSchema,
      agreeToTerms: z
        .boolean({
          required_error: 'You must agree to the terms and conditions',
        })
        .refine((val) => val === true, {
          message: 'You must agree to the terms and conditions',
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

/**
 * Login request validation
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    }),
  }),
});

/**
 * Refresh token request validation
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({
        required_error: 'Refresh token is required',
        invalid_type_error: 'Refresh token must be a string',
      })
      .min(1, 'Refresh token must not be empty'),
  }),
});

/**
 * Forgot password request validation
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Reset password request validation
 */
export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z
        .string({
          required_error: 'Reset token is required',
          invalid_type_error: 'Reset token must be a string',
        })
        .min(1, 'Reset token must not be empty'),
      newPassword: passwordSchema,
      confirmPassword: z.string({
        required_error: 'Password confirmation is required',
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

/**
 * Change password request validation
 */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({
          required_error: 'Current password is required',
          invalid_type_error: 'Current password must be a string',
        })
        .min(1, 'Current password must not be empty'),
      newPassword: passwordSchema,
      confirmPassword: z.string({
        required_error: 'Password confirmation is required',
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
});

/**
 * Update profile request validation
 */
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: nameSchema,
    lastName: nameSchema,
  }),
});

/**
 * Email validation only
 */
export const emailValidationSchema = z.object({
  email: emailSchema,
});

/**
 * Password validation only
 */
export const passwordValidationSchema = z.object({
  password: passwordSchema,
});

/**
 * Export types for TypeScript
 */
export type RegisterBody = z.infer<typeof registerSchema>['body'];
export type LoginBody = z.infer<typeof loginSchema>['body'];
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>['body'];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>['body'];
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>['body']; 