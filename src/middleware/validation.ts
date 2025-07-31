import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Validation middleware that uses Zod schemas
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request data
      const parsedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      req.query = parsedData.query || req.query;
      req.body = parsedData.body || req.body;
      req.params = parsedData.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: (err as any).received || undefined,
        }));

        logger.warn('Validation failed:', { 
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors 
        });

        ApiResponseUtil.validation(
          res,
          'Validation failed',
          {
            errors: validationErrors,
            totalErrors: validationErrors.length,
          }
        );
        return;
      }

      // Handle other types of errors
      logger.error('Validation middleware error:', error);
      ApiResponseUtil.serverError(res, 'Validation failed');
      return;
    }
  };
};

/**
 * Validate only request body
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: (err as any).received || undefined,
        }));

        logger.warn('Body validation failed:', { 
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors 
        });

        ApiResponseUtil.validation(
          res,
          'Request body validation failed',
          {
            errors: validationErrors,
            totalErrors: validationErrors.length,
          }
        );
        return;
      }

      logger.error('Body validation middleware error:', error);
      ApiResponseUtil.serverError(res, 'Validation failed');
      return;
    }
  };
};

/**
 * Validate only query parameters
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Query validation failed:', { 
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors 
        });

        ApiResponseUtil.validation(
          res,
          'Query parameters validation failed',
          {
            errors: validationErrors,
            totalErrors: validationErrors.length,
          }
        );
        return;
      }

      logger.error('Query validation middleware error:', error);
      ApiResponseUtil.serverError(res, 'Validation failed');
      return;
    }
  };
};

/**
 * Validate only URL parameters
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Params validation failed:', { 
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors 
        });

        ApiResponseUtil.validation(
          res,
          'URL parameters validation failed',
          {
            errors: validationErrors,
            totalErrors: validationErrors.length,
          }
        );
        return;
      }

      logger.error('Params validation middleware error:', error);
      ApiResponseUtil.serverError(res, 'Validation failed');
      return;
    }
  };
};

/**
 * Generic error formatter for validation errors
 */
export const formatValidationError = (error: ZodError): object => {
  const errors = error.errors.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    message: 'Validation failed',
    errors,
    totalErrors: errors.length,
  };
};

/**
 * Middleware to sanitize request data (trim strings, normalize email)
 */
export const sanitizeRequest = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  };
}; 