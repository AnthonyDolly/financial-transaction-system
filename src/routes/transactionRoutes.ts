import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { requireAdmin, requireAuth } from '../middleware/auth';
import {
  validateCreateTransaction,
  validateValidateTransaction,
  validateGetTransaction,
  validateReverseTransaction,
  validateGetTransactions,
} from '../validators/transactionValidators';
import { rateLimit } from 'express-rate-limit';

const router = Router();

/**
 * Rate limiting for transaction operations
 * More restrictive for transaction creation to prevent abuse
 */
const transactionCreateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 transactions per 15 minutes
  message: {
    success: false,
    message: 'Too many transaction attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const transactionValidateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Maximum 50 validations per 5 minutes
  message: {
    success: false,
    message: 'Too many validation attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const transactionReadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 read operations per 15 minutes
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const transactionReverseLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Maximum 5 reversals per hour (admin only)
  message: {
    success: false,
    message: 'Too many reversal attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Advanced transaction management operations
 */

/**
 * POST /transactions/validate
 * Validate transaction before processing
 */
router.post(
  '/validate',
  transactionValidateLimit,
  ...requireAuth(),
  validateValidateTransaction,
  TransactionController.validateTransaction
);

/**
 * POST /transactions
 * Create and process a new transaction
 */
router.post(
  '/',
  transactionCreateLimit,
  ...requireAuth(),
  validateCreateTransaction,
  TransactionController.processTransaction
);

/**
 * GET /transactions/my
 * Get current user's transactions with filtering and pagination
 * Must be before /:id route to avoid conflicts
 */
router.get(
  '/my',
  transactionReadLimit,
  ...requireAuth(),
  validateGetTransactions,
  TransactionController.getMyTransactions
);

/**
 * GET /transactions/:id
 * Get specific transaction by ID
 */
router.get(
  '/:id',
  transactionReadLimit,
  ...requireAuth(),
  validateGetTransaction,
  TransactionController.getTransactionById
);

/**
 * POST /transactions/:id/reverse
 * Reverse a transaction (Admin only)
 */
router.post(
  '/:id/reverse',
  transactionReverseLimit,
  ...requireAdmin(),
  validateReverseTransaction,
  TransactionController.reverseTransaction
);

export default router; 