import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { UserService } from '../services/userService';
import { ApiResponseUtil } from '../utils/response';
import { catchAsync } from '../middleware/errorHandler';

export class UserController {
  static getUsers = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await UserService.getUsers(req.query, req.user.id);
        ApiResponseUtil.paginated(res, result.data, result.meta, 'Users retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  static getUserById = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.getUserById(id, req.user.id);
        ApiResponseUtil.success(res, user, 'User retrieved successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static createUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const user = await UserService.createUser(req.body, req.user.id);
        ApiResponseUtil.created(res, user, 'User created successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User with this email already exists') {
          ApiResponseUtil.conflict(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static updateUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.updateUser(id, req.body, req.user.id);
        ApiResponseUtil.success(res, user, 'User updated successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'Email is already in use by another user') {
          ApiResponseUtil.conflict(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static updateUserRole = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const user = await UserService.updateUserRole(id, req.body, req.user.id);
        ApiResponseUtil.success(res, user, 'User role updated successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You cannot change your own role') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static deleteUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        await UserService.deleteUser(id, req.user.id);
        ApiResponseUtil.success(res, null, 'User deleted successfully');
      } catch (error) {
        const err = error as Error;
        if (err.message === 'User not found') {
          ApiResponseUtil.notFound(res, err.message);
          return;
        }
        if (err.message === 'You cannot delete your own account') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        if (err.message.includes('non-zero account balance')) {
          ApiResponseUtil.badRequest(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static getUserStats = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const stats = await UserService.getUserStats(req.user.id);
        ApiResponseUtil.success(res, stats, 'User statistics retrieved successfully');
      } catch (error) {
        throw error;
      }
    }
  );

  static bulkUserOperation = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const results = await UserService.bulkUserOperation(req.body, req.user.id);
        ApiResponseUtil.success(res, results, `Bulk ${req.body.action} operation completed`);
      } catch (error) {
        throw error;
      }
    }
  );

  static getUserActivity = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ApiResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      try {
        const result = await UserService.getUserActivity(id, req.query, req.user.id, req.user.role);
        ApiResponseUtil.paginated(
          res,
          result.data,
          result.meta,
          'User activity logs retrieved successfully'
        );
      } catch (error) {
        const err = error as Error;
        if (err.message === 'You can only access your own activity logs') {
          ApiResponseUtil.forbidden(res, err.message);
          return;
        }
        throw error;
      }
    }
  );

  static checkEmailAvailability = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      try {
        const result = await UserService.checkEmailAvailability(req.body.email);
        ApiResponseUtil.success(res, result, 'Email availability checked');
      } catch (error) {
        throw error;
      }
    }
  );
}
