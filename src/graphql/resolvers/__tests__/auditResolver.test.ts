import 'reflect-metadata';
import { AuditResolver } from '../auditResolver';
import { AuditService } from '../../../services/auditService';
import { TestDataFactory, TimeTestUtils } from '../../../test/utils/testUtils';
import { UserRole, AuditAction } from '@prisma/client';
import { GraphQLContext } from '../../context';

// Mock the AuditService
jest.mock('../../../services/auditService');
jest.mock('../../../utils/logger');

const mockAuditService = AuditService as jest.Mocked<typeof AuditService>;

describe('AuditResolver', () => {
  let resolver: AuditResolver;
  let mockContext: GraphQLContext;

  beforeEach(() => {
    resolver = new AuditResolver();
    mockContext = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      },
      req: {} as any,
      res: {} as any,
    };
    jest.clearAllMocks();
  });

  describe('auditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        TestDataFactory.createAuditLog({
          action: AuditAction.LOGIN,
          userId: 'user-1',
          user: TestDataFactory.createUser({ email: 'user1@test.com' })
        }),
        TestDataFactory.createAuditLog({
          action: AuditAction.CREATE,
          userId: 'user-2',
          user: TestDataFactory.createUser({ email: 'user2@test.com' })
        }),
      ];

      const mockConnection = {
        data: mockLogs,
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 2,
          pageInfo: {
            startCursor: 'start',
            endCursor: 'end',
          },
        },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockConnection as any);

      const input = {
        first: 10,
        after: undefined,
        filter: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
        },
      };

      const result = await resolver.auditLogs(input, mockContext);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(input);
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].action).toBe(AuditAction.LOGIN);
      expect(result.nodes[1].action).toBe(AuditAction.CREATE);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(2);
    });

    it('should handle empty results', async () => {
      const mockEmptyConnection = {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 0,
          pageInfo: {
            startCursor: null,
            endCursor: null,
          },
        },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockEmptyConnection as any);

      const input = {
        first: 10,
        filter: {
          startDate: new Date(),
          endDate: new Date(),
        },
      };

      const result = await resolver.auditLogs(input, mockContext);

      expect(result.nodes).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle logs without user data', async () => {
      const mockLogsWithoutUser = [
        TestDataFactory.createAuditLog({
          userId: null,
          user: null,
        }),
      ];

      const mockConnection = {
        data: mockLogsWithoutUser,
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 1,
          pageInfo: {
            startCursor: 'start',
            endCursor: 'end',
          },
        },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockConnection as any);

      const input = { first: 10 };
      const result = await resolver.auditLogs(input, mockContext);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].userId).toBeUndefined();
      expect(result.nodes[0].user).toBeUndefined();
    });
  });

  describe('auditStats', () => {
    it('should return audit statistics', async () => {
      const mockStats = {
        totalLogs: 1000,
        logsByAction: {
          [AuditAction.LOGIN]: 500,
          [AuditAction.CREATE]: 300,
          [AuditAction.UPDATE]: 150,
          [AuditAction.DELETE]: 50,
        },
        logsByResource: {
          User: 400,
          Transaction: 350,
          Account: 250,
        },
        logsByUser: [
          { userId: 'user-1', count: 200, email: 'user1@test.com' },
          { userId: 'user-2', count: 150, email: 'user2@test.com' },
        ],
        timeSeriesData: [
          { date: new Date('2023-01-01'), count: 50 },
          { date: new Date('2023-01-02'), count: 75 },
        ],
        averageLogsPerDay: 25.5,
        peakHour: 14,
        mostActiveUser: 'user-1',
      };

      mockAuditService.getAuditStats.mockResolvedValue(mockStats as any);

      const input = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        groupBy: 'day' as const,
      };

      const result = await resolver.auditStats(input, mockContext);

      expect(mockAuditService.getAuditStats).toHaveBeenCalledWith(input);
      expect(result.totalLogs).toBe(1000);
      expect(result.logsByAction).toEqual(mockStats.logsByAction);
      expect(result.logsByResource).toEqual(mockStats.logsByResource);
      expect(result.logsByUser).toHaveLength(2);
      expect(result.timeSeriesData).toHaveLength(2);
      expect(result.averageLogsPerDay).toBe(25.5);
      expect(result.peakHour).toBe(14);
      expect(result.mostActiveUser).toBe('user-1');
    });

    it('should handle stats with no data', async () => {
      const mockEmptyStats = {
        totalLogs: 0,
        logsByAction: {},
        logsByResource: {},
        logsByUser: [],
        timeSeriesData: [],
        averageLogsPerDay: 0,
        peakHour: 0,
        mostActiveUser: null,
      };

      mockAuditService.getAuditStats.mockResolvedValue(mockEmptyStats as any);

      const input = {
        startDate: new Date(),
        endDate: new Date(),
      };

      const result = await resolver.auditStats(input, mockContext);

      expect(result.totalLogs).toBe(0);
      expect(result.logsByUser).toHaveLength(0);
      expect(result.timeSeriesData).toHaveLength(0);
      expect(result.mostActiveUser).toBeNull();
    });
  });

  describe('auditTrail', () => {
    it('should return audit trail for a resource', async () => {
      const mockTrail = {
        resourceId: 'transaction-123',
        resourceType: 'Transaction',
        events: [
          {
            id: 'log-1',
            action: AuditAction.CREATE,
            timestamp: new Date('2023-01-01'),
            userId: 'user-1',
            userEmail: 'user1@test.com',
            changes: { amount: 1000 },
            ipAddress: '192.168.1.1',
          },
          {
            id: 'log-2',
            action: AuditAction.UPDATE,
            timestamp: new Date('2023-01-02'),
            userId: 'user-2',
            userEmail: 'user2@test.com',
            changes: { status: 'COMPLETED' },
            ipAddress: '192.168.1.2',
          },
        ],
        summary: {
          totalEvents: 2,
          firstEvent: new Date('2023-01-01'),
          lastEvent: new Date('2023-01-02'),
          involvedUsers: ['user-1', 'user-2'],
        },
      };

      mockAuditService.getResourceAuditTrail.mockResolvedValue(mockTrail as any);

      const input = {
        resourceId: 'transaction-123',
        resourceType: 'Transaction',
      };

      const result = await resolver.auditTrail(input, mockContext);

      expect(mockAuditService.getResourceAuditTrail).toHaveBeenCalledWith(input);
      expect(result.resourceId).toBe('transaction-123');
      expect(result.resourceType).toBe('Transaction');
      expect(result.events).toHaveLength(2);
      expect(result.events[0].action).toBe(AuditAction.CREATE);
      expect(result.events[1].action).toBe(AuditAction.UPDATE);
      expect(result.summary.totalEvents).toBe(2);
      expect(result.summary.involvedUsers).toEqual(['user-1', 'user-2']);
    });

    it('should handle empty audit trail', async () => {
      const mockEmptyTrail = {
        resourceId: 'nonexistent-123',
        resourceType: 'Transaction',
        events: [],
        summary: {
          totalEvents: 0,
          firstEvent: null,
          lastEvent: null,
          involvedUsers: [],
        },
      };

      mockAuditService.getResourceAuditTrail.mockResolvedValue(mockEmptyTrail as any);

      const input = {
        resourceId: 'nonexistent-123',
        resourceType: 'Transaction',
      };

      const result = await resolver.auditTrail(input, mockContext);

      expect(result.events).toHaveLength(0);
      expect(result.summary.totalEvents).toBe(0);
      expect(result.summary.involvedUsers).toHaveLength(0);
    });
  });

  describe('securityAlerts', () => {
    it('should return security alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'BRUTE_FORCE',
          severity: 'HIGH',
          title: 'Multiple failed login attempts',
          description: 'User attempted login 10 times in 5 minutes',
          userId: 'user-1',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          metadata: { attemptCount: 10, timeWindow: 300 },
          resolved: false,
          createdAt: new Date('2023-01-01'),
          resolvedAt: null,
          resolvedBy: null,
        },
        {
          id: 'alert-2',
          type: 'UNUSUAL_ADMIN_ACTIVITY',
          severity: 'MEDIUM',
          title: 'Admin access from new location',
          description: 'Admin user logged in from unusual IP',
          userId: 'admin-1',
          ipAddress: '203.0.113.1',
          userAgent: 'Chrome/90.0...',
          metadata: { previousIps: ['192.168.1.1'] },
          resolved: true,
          createdAt: new Date('2023-01-02'),
          resolvedAt: new Date('2023-01-02'),
          resolvedBy: 'admin-2',
        },
      ];

      mockAuditService.getSecurityAlerts.mockResolvedValue(mockAlerts as any);

      const result = await resolver.securityAlerts(mockContext);

      expect(mockAuditService.getSecurityAlerts).toHaveBeenCalledWith('user-123');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('BRUTE_FORCE');
      expect(result[0].severity).toBe('HIGH');
      expect(result[0].resolved).toBe(false);
      expect(result[1].type).toBe('UNUSUAL_ADMIN_ACTIVITY');
      expect(result[1].resolved).toBe(true);
    });

    it('should handle empty security alerts', async () => {
      mockAuditService.getSecurityAlerts.mockResolvedValue([]);

      const result = await resolver.securityAlerts(mockContext);

      expect(result).toHaveLength(0);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs successfully', async () => {
      const mockExportResult = {
        filename: 'audit-logs-2023.csv',
        data: [
          { id: '1', action: 'LOGIN', timestamp: new Date() },
          { id: '2', action: 'CREATE', timestamp: new Date() },
        ],
        recordCount: 2,
      };

      mockAuditService.exportAuditLogs.mockResolvedValue(mockExportResult as any);

      const input = {
        format: 'json' as const,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };

      const result = await resolver.exportAuditLogs(input, mockContext);

      expect(mockAuditService.exportAuditLogs).toHaveBeenCalledWith(
        {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
        },
        'json',
        'user-123'
      );
      expect(result.filename).toBe('audit-logs-2023.csv');
      expect(result.recordCount).toBe(2);
    });

    it('should handle export failures', async () => {
      mockAuditService.exportAuditLogs.mockRejectedValue(new Error('Export failed: Database connection error'));

      const input = {
        format: 'json' as const,
        startDate: new Date(),
        endDate: new Date(),
      };

      await expect(resolver.exportAuditLogs(input, mockContext)).rejects.toThrow(
        'Export failed: Database connection error'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle service errors in auditLogs', async () => {
      mockAuditService.getAuditLogs.mockRejectedValue(new Error('Database connection failed'));

      const input = { first: 10 };

      await expect(resolver.auditLogs(input, mockContext)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle service errors in auditStats', async () => {
      mockAuditService.getAuditStats.mockRejectedValue(new Error('Service unavailable'));

      const input = {
        startDate: new Date(),
        endDate: new Date(),
      };

      await expect(resolver.auditStats(input, mockContext)).rejects.toThrow(
        'Service unavailable'
      );
    });

    it('should handle service errors in auditTrail', async () => {
      mockAuditService.getResourceAuditTrail.mockRejectedValue(new Error('Resource not found'));

      const input = {
        resourceId: 'invalid-id',
        resourceType: 'Transaction',
      };

      await expect(resolver.auditTrail(input, mockContext)).rejects.toThrow(
        'Resource not found'
      );
    });

    it('should handle service errors in securityAlerts', async () => {
      mockAuditService.getSecurityAlerts.mockRejectedValue(new Error('Access denied'));

      await expect(resolver.securityAlerts(mockContext)).rejects.toThrow(
        'Access denied'
      );
    });

    it('should handle service errors in exportAuditLogs', async () => {
      mockAuditService.exportAuditLogs.mockRejectedValue(new Error('Export service down'));

      const input = {
        format: 'CSV' as const,
        startDate: new Date(),
        endDate: new Date(),
      };

      await expect(resolver.exportAuditLogs(input, mockContext)).rejects.toThrow(
        'Export service down'
      );
    });
  });

  describe('Authorization', () => {
    it('should work with valid admin context', async () => {
      const mockConnection = {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 0,
          pageInfo: { startCursor: null, endCursor: null },
        },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockConnection as any);

      const input = { first: 10 };
      const result = await resolver.auditLogs(input, mockContext);

      expect(result).toBeDefined();
    });

    it('should work with valid user context for basic operations', async () => {
      const userContext = {
        ...mockContext,
        user: {
          ...mockContext.user!,
          role: UserRole.USER,
        },
      };

      const mockConnection = {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 0,
          pageInfo: { startCursor: null, endCursor: null },
        },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockConnection as any);

      const input = { first: 10 };
      const result = await resolver.auditLogs(input, userContext);

      expect(result).toBeDefined();
    });
  });
}); 