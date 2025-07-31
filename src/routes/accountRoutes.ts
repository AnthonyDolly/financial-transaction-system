import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate, sanitizeRequest } from '../middleware/validation';
import {
  getAccountByIdSchema,
  transferSchema,
  depositSchema,
  withdrawSchema,
  getStatementSchema,
  freezeAccountSchema,
  unfreezeAccountSchema,
  depositToMyAccountSchema,
  withdrawFromMyAccountSchema,
  getMyStatementSchema,
} from '../validators/accountValidators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management and banking operations
 */

/**
 * GET /accounts/stats - Get account statistics (Admin only)
 */
router.get(
  '/stats',
  ...requireAdmin(),
  AccountController.getAccountStats
);

/**
 * GET /accounts/me - Get my account information
 */
router.get(
  '/me',
  ...requireAuth(),
  AccountController.getMyAccount
);

/**
 * GET /accounts/me/balance - Get my account balance
 */
router.get(
  '/me/balance',
  ...requireAuth(),
  AccountController.getMyAccountBalance
);

/**
 * POST /accounts/me/deposit - Deposit money to my account
 */
router.post(
  '/me/deposit',
  ...requireAuth(),
  sanitizeRequest(),
  validate(depositToMyAccountSchema),
  AccountController.depositToMyAccount
);

/**
 * POST /accounts/me/withdraw - Withdraw money from my account
 */
router.post(
  '/me/withdraw',
  ...requireAuth(),
  sanitizeRequest(),
  validate(withdrawFromMyAccountSchema),
  AccountController.withdrawFromMyAccount
);

/**
 * GET /accounts/me/statement - Get my account statement
 */
router.get(
  '/me/statement',
  ...requireAuth(),
  sanitizeRequest(),
  validate(getMyStatementSchema),
  AccountController.getMyAccountStatement
);

/**
 * POST /accounts/transfer - Transfer money between accounts
 */
router.post(
  '/transfer',
  ...requireAuth(),
  sanitizeRequest(),
  validate(transferSchema),
  AccountController.transfer
);

// ===============================================
// ADMIN ENDPOINTS (require account ID in URL)
// ===============================================

/**
 * GET /accounts/:id - Get account by ID (Admin only)
 */
router.get(
  '/:id',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(getAccountByIdSchema),
  AccountController.getAccountById
);

/**
 * GET /accounts/:id/balance - Get account balance (Admin only)
 */
router.get(
  '/:id/balance',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(getAccountByIdSchema),
  AccountController.getAccountBalance
);

/**
 * POST /accounts/:id/deposit - Deposit money to account (Admin only)
 */
router.post(
  '/:id/deposit',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(depositSchema),
  AccountController.deposit
);

/**
 * POST /accounts/:id/withdraw - Withdraw money from account (Admin only)
 */
router.post(
  '/:id/withdraw',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(withdrawSchema),
  AccountController.withdraw
);

/**
 * GET /accounts/:id/statement - Get account statement (Admin only)
 */
router.get(
  '/:id/statement',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(getStatementSchema),
  AccountController.getAccountStatement
);

/**
 * POST /accounts/:id/freeze - Freeze account (Admin only)
 */
router.post(
  '/:id/freeze',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(freezeAccountSchema),
  AccountController.freezeAccount
);

/**
 * POST /accounts/:id/unfreeze - Unfreeze account (Admin only)
 */
router.post(
  '/:id/unfreeze',
  ...requireAdmin(),
  sanitizeRequest(),
  validate(unfreezeAccountSchema),
  AccountController.unfreezeAccount
);

export default router; 