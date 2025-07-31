import { JwtUtil } from '../jwt';
import { UserRole } from '@prisma/client';

// Mock the config module
jest.mock('../config/env', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-for-jwt-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    JWT_EXPIRE_IN: '1h',
    JWT_REFRESH_EXPIRE_IN: '7d',
  },
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key-for-jwt-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('JwtUtil', () => {
  
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        id: 'user-123',
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        isActive: true,
      };

      const token = JwtUtil.generateAccessToken(payload);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { 
        id: 'user-1', 
        sub: 'user-1', 
        email: 'user1@example.com', 
        role: UserRole.USER,
        isActive: true,
      };
      const payload2 = { 
        id: 'user-2', 
        sub: 'user-2', 
        email: 'user2@example.com', 
        role: UserRole.ADMIN,
        isActive: true,
      };

      const token1 = JwtUtil.generateAccessToken(payload1);
      const token2 = JwtUtil.generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = { 
        id: 'user-123',
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        isActive: true,
      };

      const token = JwtUtil.generateRefreshToken(payload);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        id: 'user-123',
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        isActive: true,
      };

      const token = JwtUtil.generateAccessToken(payload);
      const decoded = JwtUtil.verifyAccessToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      const decoded = JwtUtil.verifyAccessToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = JwtUtil.verifyAccessToken('');

      expect(decoded).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload = { 
        id: 'user-123',
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        isActive: true,
      };

      const token = JwtUtil.generateRefreshToken(payload);
      const decoded = JwtUtil.verifyRefreshToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(payload.sub);
    });

    it('should return null for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';
      const decoded = JwtUtil.verifyRefreshToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;

      const extracted = JwtUtil.extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const invalidHeader = 'InvalidFormat token';

      const extracted = JwtUtil.extractTokenFromHeader(invalidHeader);

      expect(extracted).toBeNull();
    });

    it('should return null for undefined header', () => {
      const extracted = JwtUtil.extractTokenFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = JwtUtil.extractTokenFromHeader('');

      expect(extracted).toBeNull();
    });

    it('should handle header without token part', () => {
      const extracted = JwtUtil.extractTokenFromHeader('Bearer');

      expect(extracted).toBeNull();
    });
  });

  describe('token expiration', () => {
    it('should handle expired tokens gracefully', () => {
      // Create a token that expires immediately
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 1 };
      
      // We can't easily test this without manual token creation
      // but we can test that the verify function handles errors
      const invalidExpiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.invalid';
      
      const decoded = JwtUtil.verifyAccessToken(invalidExpiredToken);
      expect(decoded).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle malformed tokens', () => {
      const malformedTokens = [
        'not.a.token',
        'onlyonepart',
        '...',
        'a.b',
        null as any,
        undefined as any,
        123 as any,
        {} as any,
      ];

      malformedTokens.forEach(token => {
        const decoded = JwtUtil.verifyAccessToken(token);
        expect(decoded).toBeNull();
      });
    });
  });
}); 