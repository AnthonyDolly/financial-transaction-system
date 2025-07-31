import { AuthService } from '../authService';
import { redisClient } from '../../utils/redisClient';
import { prismaMock } from '../../test/setup';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../utils/redisClient');
jest.mock('../../utils/logger');

const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

describe('AuthService - Redis Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should store tokens in Redis when user logs in', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER' as const,
        isActive: true,
        createdAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      mockRedisClient.set.mockResolvedValue('OK');

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await AuthService.login(loginData);

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify tokens were stored in Redis
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `token:access:${mockUser.id}`,
        result.tokens.accessToken,
        expect.objectContaining({ EX: expect.any(Number) })
      );

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `token:refresh:${mockUser.id}`,
        result.tokens.refreshToken,
        expect.objectContaining({ EX: expect.any(Number) })
      );
    });

    it('should continue login process even if Redis storage fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER' as const,
        isActive: true,
        createdAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await AuthService.login(loginData);

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'user-123';
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';

      mockRedisClient.get
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      await AuthService.revokeAllUserTokens(userId);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`token:access:${userId}`);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`token:refresh:${userId}`);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `blacklist:jwt:${mockAccessToken}`,
        '1',
        expect.objectContaining({ EX: expect.any(Number) })
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `blacklist:jwt:${mockRefreshToken}`,
        '1',
        expect.objectContaining({ EX: expect.any(Number) })
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(`token:access:${userId}`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`token:refresh:${userId}`);
    });
  });

  describe('hasValidTokens', () => {
    it('should return true when user has valid tokens', async () => {
      const userId = 'user-123';
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';

      mockRedisClient.get
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await AuthService.hasValidTokens(userId);

      expect(result.hasAccessToken).toBe(true);
      expect(result.hasRefreshToken).toBe(true);
    });

    it('should return false when user has no tokens', async () => {
      const userId = 'user-123';

      mockRedisClient.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await AuthService.hasValidTokens(userId);

      expect(result.hasAccessToken).toBe(false);
      expect(result.hasRefreshToken).toBe(false);
    });

    it('should return false when Redis check fails', async () => {
      const userId = 'user-123';

      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await AuthService.hasValidTokens(userId);

      expect(result.hasAccessToken).toBe(false);
      expect(result.hasRefreshToken).toBe(false);
    });
  });
}); 