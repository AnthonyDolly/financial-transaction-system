import { Response, NextFunction } from 'express';
import { authenticate, authorize, requireAuth, requireAdmin, optionalAuth } from '../auth';
import { AuthenticatedRequest } from '../../types/auth';
import { UserRole } from '@prisma/client';
import { JwtTestUtils } from '../../test/utils/testUtils';

// Mock dependencies
jest.mock('../config/env', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-for-jwt-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    JWT_EXPIRE_IN: '1h',
    JWT_REFRESH_EXPIRE_IN: '7d',
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/utils/jwt', () => ({
  JwtUtil: {
    extractTokenFromHeader: jest.fn(),
    verifyAccessToken: jest.fn(),
  },
}));

jest.mock('@/utils/response', () => ({
  ApiResponseUtil: {
    unauthorized: jest.fn(),
    forbidden: jest.fn(),
    serverError: jest.fn(),
  },
}));

import { JwtUtil } from '../../utils/jwt';
import { ApiResponseUtil } from '../../utils/response';
import { prismaMock } from '../../test/setup';

const mockJwtUtil = JwtUtil as jest.Mocked<typeof JwtUtil>;
const mockApiResponseUtil = ApiResponseUtil as jest.Mocked<typeof ApiResponseUtil>;

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        isActive: true,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('valid-token-123');
      mockJwtUtil.verifyAccessToken.mockReturnValue(mockJwtPayload);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.unauthorized).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJwtUtil.verifyAccessToken.mockReturnValue(null);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or expired token');
    });

    it('should reject request with no authorization header', async () => {
      mockReq.headers = {};

      mockJwtUtil.extractTokenFromHeader.mockReturnValue(null);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'Access token is required');
    });

    it('should reject request with malformed authorization header', async () => {
      mockReq.headers = {
        authorization: 'InvalidFormat token-123',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue(null);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'Access token is required');
    });

    it('should handle expired tokens', async () => {
      mockReq.headers = {
        authorization: 'Bearer expired-token',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('expired-token');
      mockJwtUtil.verifyAccessToken.mockReturnValue(null); // JWT library returns null for expired tokens

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or expired token');
    });

    it('should reject when user not found in database', async () => {
      const mockJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('valid-token-123');
      mockJwtUtil.verifyAccessToken.mockReturnValue(mockJwtPayload);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'User not found');
    });

    it('should reject inactive users', async () => {
      const mockJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockInactiveUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        isActive: false,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('valid-token-123');
      mockJwtUtil.verifyAccessToken.mockReturnValue(mockJwtPayload);
      prismaMock.user.findUnique.mockResolvedValue(mockInactiveUser as any);

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(mockRes, 'User account is deactivated');
    });

    it('should continue without user when optional auth and no token', async () => {
      mockReq.headers = {};
      mockJwtUtil.extractTokenFromHeader.mockReturnValue(null);

      const authMiddleware = authenticate({ optional: true });
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.unauthorized).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should authorize user with correct role', async () => {
      mockReq.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      };

      const authorizeAdmin = authorize([UserRole.ADMIN]);
      authorizeAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.forbidden).not.toHaveBeenCalled();
    });

    it('should reject user with incorrect role', async () => {
      mockReq.user = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
      };

      const authorizeAdmin = authorize([UserRole.ADMIN]);
      authorizeAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.forbidden).toHaveBeenCalledWith(
        mockRes, 
        'Access denied. Required roles: ADMIN'
      );
    });

    it('should reject request without user', async () => {
      mockReq.user = undefined;

      const authorizeAdmin = authorize([UserRole.ADMIN]);
      authorizeAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.unauthorized).toHaveBeenCalledWith(
        mockRes, 
        'Authentication required'
      );
    });

    it('should allow user role to access user-level resources', async () => {
      mockReq.user = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
      };

      const authorizeUser = authorize([UserRole.USER]);
      authorizeUser(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.forbidden).not.toHaveBeenCalled();
    });

    it('should allow admin to access user-level resources', async () => {
      mockReq.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      };

      const authorizeUser = authorize([UserRole.USER, UserRole.ADMIN]);
      authorizeUser(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.forbidden).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    it('should return array of middlewares', () => {
      const middlewares = requireAuth();
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(2);
    });

    it('should work with custom roles', () => {
      const middlewares = requireAuth([UserRole.ADMIN]);
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(2);
    });
  });

  describe('requireAdmin middleware', () => {
    it('should return array of middlewares for admin only', () => {
      const middlewares = requireAdmin();
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(2);
    });
  });

  describe('optionalAuth middleware', () => {
    it('should set user when valid token provided', async () => {
      const mockJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        isActive: true,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('valid-token-123');
      mockJwtUtil.verifyAccessToken.mockReturnValue(mockJwtPayload);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const optionalAuthMiddleware = optionalAuth();
      await optionalAuthMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.unauthorized).not.toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      mockReq.headers = {};
      mockJwtUtil.extractTokenFromHeader.mockReturnValue(null);

      const optionalAuthMiddleware = optionalAuth();
      await optionalAuthMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.unauthorized).not.toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJwtUtil.verifyAccessToken.mockReturnValue(null);

      const optionalAuthMiddleware = optionalAuth();
      await optionalAuthMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockApiResponseUtil.unauthorized).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle JWT verification errors gracefully', async () => {
      mockReq.headers = {
        authorization: 'Bearer malformed-token',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('malformed-token');
      mockJwtUtil.verifyAccessToken.mockImplementation(() => {
        throw new Error('JWT malformed');
      });

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.serverError).toHaveBeenCalledWith(mockRes, 'Authentication failed');
    });

    it('should handle database errors gracefully', async () => {
      const mockJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        type: 'access' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwtUtil.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJwtUtil.verifyAccessToken.mockReturnValue(mockJwtPayload);
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const authMiddleware = authenticate();
      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.serverError).toHaveBeenCalledWith(mockRes, 'Authentication failed');
    });

    it('should handle authorization with null user role', async () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: null as any,
        isActive: true,
      };

      const authorizeAdmin = authorize([UserRole.ADMIN]);
      authorizeAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockApiResponseUtil.forbidden).toHaveBeenCalledWith(
        mockRes,
        'Access denied. Required roles: ADMIN'
      );
    });
  });
}); 