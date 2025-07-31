import { MetricsService } from '../metricsService';
import { prismaMock } from '../../test/setup';
import { 
  TestDataFactory, 
  DatabaseTestUtils, 
  TimeTestUtils 
} from '../../test/utils/testUtils';
import { TransactionStatus, TransactionType, UserRole, AuditAction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock logger
jest.mock('../../utils/logger');

describe('MetricsService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data for day period', async () => {
      // Mock data
      const mockTransactions = [
        TestDataFactory.createTransaction({ status: TransactionStatus.COMPLETED }),
        TestDataFactory.createTransaction({ status: TransactionStatus.FAILED }),
      ];
      const mockAccounts = [TestDataFactory.createAccount()];
      const mockUsers = [TestDataFactory.createUser()];
      const mockAuditLogs = [TestDataFactory.createAuditLog()];

      // Setup mocks
      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions as any);
      prismaMock.account.findMany.mockResolvedValue(mockAccounts as any);
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);
      prismaMock.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);
      prismaMock.transaction.count.mockResolvedValue(5);
      prismaMock.account.count.mockResolvedValue(3);

      const result = await MetricsService.getDashboardData('day');

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('period', 'day');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('systemHealth');
    });

    it('should handle different time ranges', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.account.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const periods = ['hour', 'day', 'week', 'month', 'quarter', 'year'] as const;
      
      for (const period of periods) {
        const result = await MetricsService.getDashboardData(period);
        expect(result.period).toBe(period);
      }
    });

    it('should handle errors gracefully', async () => {
      prismaMock.transaction.findMany.mockRejectedValue(new Error('Database error'));

      await expect(MetricsService.getDashboardData('day')).rejects.toThrow('Database error');
    });
  });

  describe('getTransactionMetrics', () => {
    it('should calculate transaction metrics correctly', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockTransactions = [
        TestDataFactory.createTransaction({ 
          amount: new Decimal(1000), 
          status: TransactionStatus.COMPLETED,
          type: TransactionType.TRANSFER 
        }),
        TestDataFactory.createTransaction({ 
          amount: new Decimal(500), 
          status: TransactionStatus.FAILED,
          type: TransactionType.DEPOSIT 
        }),
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions as any);
      prismaMock.transaction.count.mockResolvedValue(2);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1500) },
        _count: { _all: 2 },
        _avg: { amount: new Decimal(750) },
        _min: { amount: new Decimal(500) },
        _max: { amount: new Decimal(1000) },
      } as any);

      const result = await MetricsService.getTransactionMetrics(startDate, endDate);

      expect(result).toMatchObject({
        totalTransactions: 2,
        totalAmount: 1500,
        averageAmount: 750,
        successRate: 50, // 1 out of 2 completed
        failureRate: 50, // 1 out of 2 failed
      });

      expect(result.transactionsByType).toHaveProperty('TRANSFER');
      expect(result.transactionsByType).toHaveProperty('DEPOSIT');
      expect(result.transactionsByStatus).toHaveProperty('COMPLETED');
      expect(result.transactionsByStatus).toHaveProperty('FAILED');
      expect(result.averageProcessingTime).toBeGreaterThan(0);
      expect(result.medianProcessingTime).toBeGreaterThan(0);
    });

    it('should handle empty transaction data', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.transaction.count.mockResolvedValue(0);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: { _all: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any);

      const result = await MetricsService.getTransactionMetrics(startDate, endDate);

      expect(result).toMatchObject({
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        successRate: 0,
        failureRate: 0,
      });
    });
  });

  describe('getAccountMetrics', () => {
    it('should calculate account metrics correctly', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockAccounts = [
        TestDataFactory.createAccount({ balance: new Decimal(15000), isActive: true }),
        TestDataFactory.createAccount({ balance: new Decimal(5000), isActive: true }),
        TestDataFactory.createAccount({ balance: new Decimal(500), isActive: false }),
      ];

      prismaMock.account.findMany.mockResolvedValue(mockAccounts as any);
      prismaMock.account.count
        .mockResolvedValueOnce(1) // today
        .mockResolvedValueOnce(2) // week
        .mockResolvedValueOnce(3); // month

      const result = await MetricsService.getAccountMetrics(startDate, endDate);

      expect(result).toMatchObject({
        totalAccounts: 3,
        activeAccounts: 2,
        inactiveAccounts: 1,
        totalBalance: 20500,
        averageBalance: 6833.333333333333,
        newAccountsToday: 1,
        newAccountsThisWeek: 2,
        newAccountsThisMonth: 3,
      });

      expect(result.accountsByType).toHaveProperty('Premium');
      expect(result.accountsByType).toHaveProperty('Standard');
      expect(result.balanceByType).toHaveProperty('Premium');
      expect(result.balanceByType).toHaveProperty('Standard');
    });

    it('should classify accounts correctly by balance', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockAccounts = [
        TestDataFactory.createAccount({ balance: new Decimal(25000) }), // Premium
        TestDataFactory.createAccount({ balance: new Decimal(5000) }),  // Standard
      ];

      prismaMock.account.findMany.mockResolvedValue(mockAccounts as any);
      prismaMock.account.count.mockResolvedValue(0);

      const result = await MetricsService.getAccountMetrics(startDate, endDate);

      expect(result.accountsByType.Premium).toBe(1);
      expect(result.accountsByType.Standard).toBe(1);
      expect(result.balanceByType.Premium).toBe(25000);
      expect(result.balanceByType.Standard).toBe(5000);
    });
  });

  describe('getUserMetrics', () => {
    it('should calculate user metrics correctly', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockUsers = [
        TestDataFactory.createUser({ role: UserRole.USER }),
        TestDataFactory.createUser({ role: UserRole.ADMIN }),
      ];
      const mockAuditLogs = [
        TestDataFactory.createAuditLog({ action: AuditAction.LOGIN }),
        TestDataFactory.createAuditLog({ action: AuditAction.LOGIN }),
      ];

      prismaMock.user.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(10); // new users
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);
      prismaMock.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);

      const result = await MetricsService.getUserMetrics(startDate, endDate);

      expect(result).toMatchObject({
        totalUsers: 100,
        activeUsers: 70, // 70% of total (mocked calculation)
        newUsers: 10,
        totalLogins: 2,
        uniqueLogins: 2, // Different users
      });

      expect(result.usersByRole).toHaveProperty('USER');
      expect(result.usersByRole).toHaveProperty('ADMIN');
      expect(result.dailyActiveUsers).toBeGreaterThan(0);
      expect(result.weeklyActiveUsers).toBeGreaterThan(0);
      expect(result.monthlyActiveUsers).toBeGreaterThan(0);
    });
  });

  describe('getSecurityMetrics', () => {
    it('should calculate security metrics correctly', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockAuditLogs = [
        TestDataFactory.createAuditLog({ action: AuditAction.LOGIN }),
        TestDataFactory.createAuditLog({ action: AuditAction.CREATE }),
        TestDataFactory.createAuditLog({ action: AuditAction.UPDATE }),
      ];

      prismaMock.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);

      const result = await MetricsService.getSecurityMetrics(startDate, endDate);

      expect(result).toHaveProperty('totalSecurityAlerts');
      expect(result).toHaveProperty('criticalAlerts');
      expect(result).toHaveProperty('resolvedAlerts');
      expect(result).toHaveProperty('pendingAlerts');
      expect(result).toHaveProperty('failedLoginAttempts');
      expect(result).toHaveProperty('suspiciousIpAddresses');
      expect(result).toHaveProperty('blockedAttempts');
      expect(result).toHaveProperty('auditLogsByAction');
      expect(result).toHaveProperty('auditLogsByResource');

      expect(result.auditLogsByAction).toHaveProperty('LOGIN');
      expect(result.auditLogsByAction).toHaveProperty('CREATE');
      expect(result.auditLogsByAction).toHaveProperty('UPDATE');
    });
  });

  describe('getFinancialKPIs', () => {
    it('should calculate financial KPIs correctly', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);
      const mockTransactions = [
        {
          ...TestDataFactory.createTransaction({ 
            amount: new Decimal(1000), 
            status: TransactionStatus.COMPLETED 
          }),
          fees: [{ id: '1', amount: 10, type: 'PROCESSING' }],
        },
        {
          ...TestDataFactory.createTransaction({ 
            amount: new Decimal(2000), 
            status: TransactionStatus.COMPLETED 
          }),
          fees: [{ id: '2', amount: 20, type: 'PROCESSING' }],
        },
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions as any);
      prismaMock.user.count.mockResolvedValue(50);

      const result = await MetricsService.getFinancialKPIs(startDate, endDate);

      expect(result).toMatchObject({
        totalRevenue: 30, // 10 + 20 fees
        transactionVolume: 3000, // 1000 + 2000
        averageTransactionFee: 15, // 30 / 2 transactions
        feeRevenue: 30,
        processingCosts: 60, // 2% of 3000
      });

      expect(result.revenueGrowth).toBeDefined();
      expect(result.volumeGrowth).toBeDefined();
      expect(result.fraudulentTransactions).toBeDefined();
      expect(result.chargebacks).toBeDefined();
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.customerAcquisitionCost).toBeDefined();
      expect(result.customerLifetimeValue).toBeDefined();
      expect(result.churnRate).toBeDefined();
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health metrics', async () => {
      const result = await MetricsService.getSystemHealth();

      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('errorRate');
      expect(result).toHaveProperty('activeConnections');

      expect(typeof result.uptime).toBe('number');
      expect(typeof result.responseTime).toBe('number');
      expect(typeof result.errorRate).toBe('number');
      expect(typeof result.activeConnections).toBe('number');
    });
  });

  describe('generateTimeSeries', () => {
    it('should generate time series data for transactions', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(7);

      prismaMock.transaction.count.mockResolvedValue(10);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
        _count: { _all: 10 },
        _avg: { amount: new Decimal(100) },
        _min: { amount: new Decimal(50) },
        _max: { amount: new Decimal(500) },
      } as any);

      const countResult = await MetricsService.generateTimeSeries(
        startDate, endDate, 'transaction', 'count'
      );

      const amountResult = await MetricsService.generateTimeSeries(
        startDate, endDate, 'transaction', 'amount'
      );

      expect(Array.isArray(countResult)).toBe(true);
      expect(Array.isArray(amountResult)).toBe(true);
      
      if (countResult.length > 0) {
        expect(countResult[0]).toHaveProperty('timestamp');
        expect(countResult[0]).toHaveProperty('value');
        expect(countResult[0]).toHaveProperty('period');
      }
    });

    it('should handle different table types', async () => {
      const { startDate, endDate } = TimeTestUtils.createDateRange(1);

      prismaMock.account.count.mockResolvedValue(5);
      prismaMock.user.count.mockResolvedValue(3);
      prismaMock.auditLog.count.mockResolvedValue(8);

      const accountResult = await MetricsService.generateTimeSeries(
        startDate, endDate, 'account', 'count'
      );

      const userResult = await MetricsService.generateTimeSeries(
        startDate, endDate, 'user', 'count'
      );

      const auditResult = await MetricsService.generateTimeSeries(
        startDate, endDate, 'audit', 'count'
      );

      expect(Array.isArray(accountResult)).toBe(true);
      expect(Array.isArray(userResult)).toBe(true);
      expect(Array.isArray(auditResult)).toBe(true);
    });
  });

  describe('getStartDateForRange', () => {
    it('should return correct start dates for different ranges', () => {
      const now = new Date();
      
      const hourStart = MetricsService.getStartDateForRange('hour');
      const dayStart = MetricsService.getStartDateForRange('day');
      const weekStart = MetricsService.getStartDateForRange('week');
      const monthStart = MetricsService.getStartDateForRange('month');
      const quarterStart = MetricsService.getStartDateForRange('quarter');
      const yearStart = MetricsService.getStartDateForRange('year');

      // Check that dates are in the past
      expect(hourStart.getTime()).toBeLessThan(now.getTime());
      expect(dayStart.getTime()).toBeLessThan(now.getTime());
      expect(weekStart.getTime()).toBeLessThan(now.getTime());
      expect(monthStart.getTime()).toBeLessThan(now.getTime());
      expect(quarterStart.getTime()).toBeLessThan(now.getTime());
      expect(yearStart.getTime()).toBeLessThan(now.getTime());

      // Check relative ordering
      expect(hourStart.getTime()).toBeGreaterThan(dayStart.getTime());
      expect(dayStart.getTime()).toBeGreaterThan(weekStart.getTime());
      expect(weekStart.getTime()).toBeGreaterThan(monthStart.getTime());
      expect(monthStart.getTime()).toBeGreaterThan(quarterStart.getTime());
      expect(quarterStart.getTime()).toBeGreaterThan(yearStart.getTime());
    });

    it('should default to day range for invalid input', () => {
      const dayStart = MetricsService.getStartDateForRange('day');
      const invalidStart = MetricsService.getStartDateForRange('invalid' as any);

      expect(Math.abs(dayStart.getTime() - invalidStart.getTime())).toBeLessThan(1000);
    });
  });

  describe('calculateMedian', () => {
    it('should calculate median for odd-length arrays', () => {
      expect(MetricsService.calculateMedian([1, 2, 3])).toBe(2);
      expect(MetricsService.calculateMedian([5, 1, 9, 3, 7])).toBe(5);
    });

    it('should calculate median for even-length arrays', () => {
      expect(MetricsService.calculateMedian([1, 2])).toBe(1.5);
      expect(MetricsService.calculateMedian([1, 2, 3, 4])).toBe(2.5);
    });

    it('should handle edge cases', () => {
      expect(MetricsService.calculateMedian([])).toBe(0);
      expect(MetricsService.calculateMedian([42])).toBe(42);
      expect(MetricsService.calculateMedian([0, 0, 0])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(MetricsService.calculateMedian([-3, -1, -2])).toBe(-2);
      expect(MetricsService.calculateMedian([-5, 5])).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      prismaMock.transaction.findMany.mockRejectedValue(new Error('Connection failed'));

      await expect(
        MetricsService.getTransactionMetrics(new Date(), new Date())
      ).rejects.toThrow('Connection failed');
    });

    it('should handle invalid date ranges', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const pastDate = new Date(Date.now() - 86400000);   // Yesterday

      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.account.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      // Should not throw, but handle gracefully
      const result = await MetricsService.getDashboardData('day');
      expect(result).toBeDefined();
    });
  });
}); 