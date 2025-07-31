import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { TransactionService } from '../services/transactionService';
import { ApiResponseUtil } from '../utils/response';
import { catchAsync } from '../middleware/errorHandler';
import { redisClient } from '../utils/redisClient';

export class TransactionController {
  static validateTransaction = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const validation = await TransactionService.validateTransaction(req.body, req.user.id);
        ApiResponseUtil.success(res, validation, 'Transaction validated successfully');
      } catch (error) {
        const err = error as Error;
        ApiResponseUtil.badRequest(res, err.message);
        return;
      }
    }
  );

  static processTransaction = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const transaction = await TransactionService.processTransaction(req.body, req.user.id);
        ApiResponseUtil.created(res, transaction, 'Transaction processed successfully');
      } catch (error) {
        const err = error as Error;
        if (
          err.message.includes('validation failed') ||
          err.message.includes('Insufficient funds')
        ) {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        if (err.message.includes('not found')) {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message.includes('can only transfer from your own')) {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static getTransactionById = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Transaction ID is required');
        return;
      }

      try {
        const transaction = await TransactionService.getTransactionById(
          id,
          req.user.id,
          req.user.role
        );
        ApiResponseUtil.success(res, transaction, 'Transaction retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Transaction not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You can only view your own transactions') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static getMyTransactions = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const cacheKey = `user:${req.user.id}:transactions:${JSON.stringify(req.query)}`;
      try {
        // Try to get from cache
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          ApiResponseUtil.paginated(
            res,
            parsed.data,
            parsed.meta,
            'Transactions retrieved successfully (cache)'
          );
          return;
        }
        // Not cached, fetch and cache
        const result = await TransactionService.getUserTransactions(req.user.id, req.query);
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 }); // TTL 60s
        ApiResponseUtil.paginated(
          res,
          result.data,
          result.meta,
          'Transactions retrieved successfully'
        );
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User account not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static reverseTransaction = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'Transaction ID is required');
        return;
      }

      if (!reason) {
        ApiResponseUtil.badRequest(res, 'Reason is required');
        return;
      }

      try {
        const reversalTransaction = await TransactionService.reverseTransaction(
          id,
          reason,
          req.user.id,
          req.user.role
        );
        ApiResponseUtil.success(res, reversalTransaction, 'Transaction reversed successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'Only administrators can reverse transactions') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message === 'Original transaction not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (
          err.message.includes('Can only reverse') ||
          err.message.includes('already been reversed')
        ) {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );
}
