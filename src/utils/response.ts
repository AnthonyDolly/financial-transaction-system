import { Response } from 'express';
import { ApiResponse, ApiError, PaginatedResponse, PaginationMeta } from '../types/api';

export class ApiResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: any
  ): Response {
    const response: ApiError = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message: string = 'Created'): Response {
    return this.success(res, data, message, 201);
  }

  static updated<T>(res: Response, data: T, message: string = 'Updated'): Response {
    return this.success(res, data, message, 200);
  }

  static deleted(res: Response, message: string = 'Deleted'): Response {
    return this.success(res, null, message, 200);
  }

  static badRequest(res: Response, message: string = 'Bad Request', details?: any): Response {
    return this.error(res, message, 'BAD_REQUEST', 400, details);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 'UNAUTHORIZED', 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 'FORBIDDEN', 403);
  }

  static notFound(res: Response, message: string = 'Not Found'): Response {
    return this.error(res, message, 'NOT_FOUND', 404);
  }

  static conflict(res: Response, message: string = 'Conflict'): Response {
    return this.error(res, message, 'CONFLICT', 409);
  }

  static validation(res: Response, message: string = 'Validation Error', details?: any): Response {
    return this.error(res, message, 'VALIDATION_ERROR', 422, details);
  }

  static rateLimit(res: Response, message: string = 'Too Many Requests'): Response {
    return this.error(res, message, 'RATE_LIMIT', 429);
  }

  static serverError(res: Response, message: string = 'Internal Server Error'): Response {
    return this.error(res, message, 'INTERNAL_ERROR', 500);
  }
}

export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}; 