import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { AccountService } from '../services/accountService';
import { ApiResponseUtil } from '../utils/response';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';

export class AccountController {
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
