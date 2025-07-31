import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { AccountService } from '../services/accountService';
import { ApiResponseUtil } from '../utils/response';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         userId:
 *           type: string
 *           example: "cmddybmu40000vt4g734qx48k"
 *         balance:
 *           type: number
 *           example: 1500.50
 *         currency:
 *           type: string
 *           example: "USD"
 *         isActive:
 *           type: boolean
 *           example: true
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
 *             role:
 *               type: string
 *               enum: [USER, ADMIN]
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         accountId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT]
 *         amount:
 *           type: number
 *           example: 500.00
 *         balance:
 *           type: number
 *           example: 1500.50
 *         description:
 *           type: string
 *         reference:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         relatedAccountId:
 *           type: string
 *         metadata:
 *           type: object
 */


export class AccountController {
  /**
   * @swagger
   * /accounts/me:
   *   get:
   *     summary: Get my account information
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/Account'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Account not found
   */
  static getMyAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const cacheKey = `user:${req.user.id}:account`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          ApiResponseUtil.success(
            res,
            JSON.parse(cached),
            'Account retrieved successfully (cache)'
          );
          return;
        }
        const account = await AccountService.getMyAccount(req.user.id);
        await redisClient.set(cacheKey, JSON.stringify(account), { EX: 60 });
        ApiResponseUtil.success(res, account, 'Account retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found for current user') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/me/balance:
   *   get:
   *     summary: Get my account balance
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account balance retrieved successfully
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
   *                         accountId:
   *                           type: string
   *                         balance:
   *                           type: number
   *                         currency:
   *                           type: string
   *                         availableBalance:
   *                           type: number
   *                         pendingTransactions:
   *                           type: number
   *                         lastUpdated:
   *                           type: string
   *                           format: date-time
   */
  static getMyAccountBalance = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const cacheKey = `user:${req.user.id}:account:balance`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          ApiResponseUtil.success(
            res,
            JSON.parse(cached),
            'Account balance retrieved successfully (cache)'
          );
          return;
        }
        const balance = await AccountService.getMyAccountBalance(req.user.id);
        await redisClient.set(cacheKey, JSON.stringify(balance), { EX: 60 });
        ApiResponseUtil.success(res, balance, 'Account balance retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found for current user') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/me/deposit:
   *   post:
   *     summary: Deposit money to my account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - source
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 1000.00
   *               description:
   *                 type: string
   *                 example: "Salary deposit"
   *               reference:
   *                 type: string
   *                 example: "PAY-2024-001"
   *               source:
   *                 type: string
   *                 enum: [bank_transfer, cash, check, online, other]
   *                 example: "bank_transfer"
   *     responses:
   *       200:
   *         description: Deposit completed successfully
   *       404:
   *         description: Account not found
   */
  static depositToMyAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await AccountService.depositToMyAccount(req.body, req.user.id);
        ApiResponseUtil.success(res, result, 'Deposit completed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found for current user') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message.includes('inactive account')) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/me/withdraw:
   *   post:
   *     summary: Withdraw money from my account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - method
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 200.00
   *               description:
   *                 type: string
   *                 example: "ATM withdrawal"
   *               reference:
   *                 type: string
   *                 example: "ATM-001-2024"
   *               method:
   *                 type: string
   *                 enum: [atm, bank_counter, online, check, other]
   *                 example: "atm"
   *     responses:
   *       200:
   *         description: Withdrawal completed successfully
   *       400:
   *         description: Insufficient funds
   *       404:
   *         description: Account not found
   */
  static withdrawFromMyAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await AccountService.withdrawFromMyAccount(req.body, req.user.id);
        ApiResponseUtil.success(res, result, 'Withdrawal completed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found for current user') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message.includes('inactive account')) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message === 'Insufficient funds') {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/me/statement:
   *   get:
   *     summary: Get my account statement (transaction history)
   *     tags: [Accounts]
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
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: minAmount
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxAmount
   *         schema:
   *           type: number
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in description or reference
   *     responses:
   *       200:
   *         description: Account statement retrieved successfully
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
   *                         $ref: '#/components/schemas/Transaction'
   */
  static getMyAccountStatement = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }
      const cacheKey = `user:${req.user.id}:account:statement`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          ApiResponseUtil.success(
            res,
            JSON.parse(cached),
            'Account statement retrieved successfully (cache)'
          );
          return;
        }
        const account = await AccountService.getMyAccountStatement(
          req.query,
          req.user.id,
          req.user.role
        );
        await redisClient.set(cacheKey, JSON.stringify(account), { EX: 60 });
        ApiResponseUtil.success(res, account, 'Account statement retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found for current user') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}:
   *   get:
   *     summary: Get account by ID
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     responses:
   *       200:
   *         description: Account retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/Account'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   *       404:
   *         description: Account not found
   */
  static getAccountById = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const account = await AccountService.getAccountById(id, req.user.id);
        ApiResponseUtil.success(res, account, 'Account retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/balance:
   *   get:
   *     summary: Get account balance
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     responses:
   *       200:
   *         description: Account balance retrieved successfully
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
   *                         accountId:
   *                           type: string
   *                         balance:
   *                           type: number
   *                         currency:
   *                           type: string
   *                         availableBalance:
   *                           type: number
   *                         pendingTransactions:
   *                           type: number
   *                         lastUpdated:
   *                           type: string
   *                           format: date-time
   */
  static getAccountBalance = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const balance = await AccountService.getAccountBalance(id, req.user.id);
        ApiResponseUtil.success(res, balance, 'Account balance retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You can only access your own account balance') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/transfer:
   *   post:
   *     summary: Transfer money between accounts
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fromAccountId
   *               - toAccountId
   *               - amount
   *             properties:
   *               fromAccountId:
   *                 type: string
   *                 example: "cmddybmu90005vt4ghd8frbqj"
   *               toAccountId:
   *                 type: string
   *                 example: "cmddybmub0007vt4g9c57c5so"
   *               amount:
   *                 type: number
   *                 example: 500.00
   *               description:
   *                 type: string
   *                 example: "Payment for services"
   *               reference:
   *                 type: string
   *                 example: "INV-2024-001"
   *     responses:
   *       200:
   *         description: Transfer completed successfully
   *       400:
   *         description: Invalid request or insufficient funds
   *       403:
   *         description: Access denied
   *       404:
   *         description: Account not found
   */
  static transfer = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await AccountService.transfer(req.body, req.user.id, req.user.role);
        ApiResponseUtil.success(res, result, 'Transfer completed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'One or both accounts not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (
          err.message.includes('can only transfer from your own') ||
          err.message.includes('inactive accounts')
        ) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message === 'Insufficient funds') {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/deposit:
   *   post:
   *     summary: Deposit money to account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - source
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 1000.00
   *               description:
   *                 type: string
   *                 example: "Salary deposit"
   *               reference:
   *                 type: string
   *                 example: "PAY-2024-001"
   *               source:
   *                 type: string
   *                 enum: [bank_transfer, cash, check, online, other]
   *                 example: "bank_transfer"
   *     responses:
   *       200:
   *         description: Deposit completed successfully
   *       403:
   *         description: Access denied
   *       404:
   *         description: Account not found
   */
  static deposit = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const result = await AccountService.deposit(id, req.body, req.user.id, req.user.role);
        ApiResponseUtil.success(res, result, 'Deposit completed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (
          err.message.includes('can only deposit to your own') ||
          err.message.includes('inactive account')
        ) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/withdraw:
   *   post:
   *     summary: Withdraw money from account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - method
   *             properties:
   *               amount:
   *                 type: number
   *                 example: 200.00
   *               description:
   *                 type: string
   *                 example: "ATM withdrawal"
   *               reference:
   *                 type: string
   *                 example: "ATM-001-2024"
   *               method:
   *                 type: string
   *                 enum: [atm, bank_counter, online, check, other]
   *                 example: "atm"
   *     responses:
   *       200:
   *         description: Withdrawal completed successfully
   *       400:
   *         description: Insufficient funds
   *       403:
   *         description: Access denied
   *       404:
   *         description: Account not found
   */
  static withdraw = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const result = await AccountService.withdraw(id, req.body, req.user.id, req.user.role);
        ApiResponseUtil.success(res, result, 'Withdrawal completed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (
          err.message.includes('can only withdraw from your own') ||
          err.message.includes('inactive account')
        ) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message === 'Insufficient funds') {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/statement:
   *   get:
   *     summary: Get account statement (transaction history)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
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
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT]
   *       - in: query
   *         name: minAmount
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxAmount
   *         schema:
   *           type: number
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in description or reference
   *     responses:
   *       200:
   *         description: Account statement retrieved successfully
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
   *                         $ref: '#/components/schemas/Transaction'
   */
  static getAccountStatement = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const result = await AccountService.getAccountStatement(
          id,
          req.query,
          req.user.id,
          req.user.role
        );
        ApiResponseUtil.paginated(
          res,
          result.data,
          result.meta,
          'Account statement retrieved successfully'
        );
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You can only access your own account statement') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/freeze:
   *   post:
   *     summary: Freeze account (Admin only)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 example: "Suspicious activity detected"
   *               duration:
   *                 type: number
   *                 description: Duration in days
   *                 example: 30
   *               notifyUser:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Account frozen successfully
   *       403:
   *         description: Admin access required
   *       404:
   *         description: Account not found
   */
  static freezeAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const account = await AccountService.freezeAccount(id, req.body, req.user.id);
        ApiResponseUtil.success(res, account, 'Account frozen successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'Account is already inactive') {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/{id}/unfreeze:
   *   post:
   *     summary: Unfreeze account (Admin only)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Account ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 example: "Investigation completed, no issues found"
   *               notifyUser:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Account unfrozen successfully
   *       400:
   *         description: Account is already active
   *       403:
   *         description: Admin access required
   *       404:
   *         description: Account not found
   */
  static unfreezeAccount = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Account ID is required');
        return;
      }

      try {
        const account = await AccountService.unfreezeAccount(id, req.body, req.user.id);
        ApiResponseUtil.success(res, account, 'Account unfrozen successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'Account is already active') {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /accounts/stats:
   *   get:
   *     summary: Get account statistics (Admin only)
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account statistics retrieved successfully
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
   *                         totalBalance:
   *                           type: number
   *                         totalAccounts:
   *                           type: number
   *                         activeAccounts:
   *                           type: number
   *                         inactiveAccounts:
   *                           type: number
   *                         totalTransactions:
   *                           type: number
   *                         totalDeposits:
   *                           type: number
   *                         totalWithdrawals:
   *                           type: number
   *                         averageBalance:
   *                           type: number
   *                         currency:
   *                           type: string
   */
  static getAccountStats = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const stats = await AccountService.getAccountStats(req.user.id);
        ApiResponseUtil.success(res, stats, 'Account statistics retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );
}
