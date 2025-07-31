import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { 
  DashboardData, 
  TransactionMetrics, 
  AccountMetrics, 
  UserMetrics, 
  SecurityMetrics, 
  FinancialKPIs,
  TimeRange,
  BaseMetric 
} from '../types/analytics';
import { TransactionType, TransactionStatus, UserRole, AuditAction } from '@prisma/client';

/**
 * Metrics Service
 * Calculates real-time metrics and KPIs for dashboards
 */
export class MetricsService {
  /**
   * Get complete dashboard data
   */
  static async getDashboardData(
    timeRange: TimeRange = 'day',
    userId?: string
  ): Promise<DashboardData> {
    try {
      const startDate = this.getStartDateForRange(timeRange);
      const endDate = new Date();

      const [transactions, accounts, users, security, kpis] = await Promise.all([
        this.getTransactionMetrics(startDate, endDate),
        this.getAccountMetrics(startDate, endDate),
        this.getUserMetrics(startDate, endDate),
        this.getSecurityMetrics(startDate, endDate),
        this.getFinancialKPIs(startDate, endDate),
      ]);

      // Get system health metrics
      const systemHealth = await this.getSystemHealth();

      return {
        timestamp: new Date(),
        period: timeRange,
        transactions,
        accounts,
        users,
        security,
        kpis,
        systemHealth,
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get transaction metrics
   */
  static async getTransactionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<TransactionMetrics> {
    try {
      // Base transaction query
      const baseQuery = {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      };

      // Get all transactions in period
      const transactions = await prisma.transaction.findMany({
        ...baseQuery,
        include: {
          fees: true,
        },
      });

      // Calculate basic metrics
      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

      // Group by type
      const transactionsByType = transactions.reduce((acc, transaction) => {
        acc[transaction.type] = (acc[transaction.type] || 0) + 1;
        return acc;
      }, {} as Record<TransactionType, number>);

      const amountsByType = transactions.reduce((acc, transaction) => {
        acc[transaction.type] = (acc[transaction.type] || 0) + Number(transaction.amount);
        return acc;
      }, {} as Record<TransactionType, number>);

      // Group by status
      const transactionsByStatus = transactions.reduce((acc, transaction) => {
        acc[transaction.status] = (acc[transaction.status] || 0) + 1;
        return acc;
      }, {} as Record<TransactionStatus, number>);

      // Calculate success/failure rates
      const completedTransactions = transactionsByStatus[TransactionStatus.COMPLETED] || 0;
      const failedTransactions = transactionsByStatus[TransactionStatus.FAILED] || 0;
      const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;
      const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;

      // Calculate processing times (simplified - using random values for demo)
      const averageProcessingTime = Math.random() * 1000 + 500; // 500-1500ms
      const medianProcessingTime = Math.random() * 800 + 400; // 400-1200ms

      // Generate time series data
      const transactionVolume = await this.generateTimeSeries(
        startDate, endDate, 'transaction', 'count'
      );
      const transactionAmount = await this.generateTimeSeries(
        startDate, endDate, 'transaction', 'amount'
      );

      return {
        totalTransactions,
        totalAmount,
        averageAmount,
        transactionsByType,
        amountsByType,
        transactionsByStatus,
        successRate,
        failureRate,
        averageProcessingTime,
        medianProcessingTime,
        transactionVolume,
        transactionAmount,
      };
    } catch (error) {
      logger.error('Error calculating transaction metrics:', error);
      throw error;
    }
  }

  /**
   * Get account metrics
   */
  static async getAccountMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<AccountMetrics> {
    try {
      // Get all accounts
      const allAccounts = await prisma.account.findMany({
        include: {
          user: true,
        },
      });

      const totalAccounts = allAccounts.length;
      const activeAccounts = allAccounts.filter(a => a.isActive).length;
      const inactiveAccounts = totalAccounts - activeAccounts;

      // Calculate balance metrics
      const balances = allAccounts.map(a => Number(a.balance));
      const totalBalance = balances.reduce((sum, balance) => sum + balance, 0);
      const averageBalance = balances.length > 0 ? totalBalance / balances.length : 0;
      const medianBalance = this.calculateMedian(balances);

      // Group by account type (simplified classification)
      const accountsByType = {
        'Premium': allAccounts.filter(a => Number(a.balance) >= 10000).length,
        'Standard': allAccounts.filter(a => Number(a.balance) < 10000).length,
      };

      const balanceByType = {
        'Premium': allAccounts
          .filter(a => Number(a.balance) >= 10000)
          .reduce((sum, a) => sum + Number(a.balance), 0),
        'Standard': allAccounts
          .filter(a => Number(a.balance) < 10000)
          .reduce((sum, a) => sum + Number(a.balance), 0),
      };

      // Calculate growth metrics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const newAccountsToday = await prisma.account.count({
        where: { createdAt: { gte: todayStart } }
      });

      const newAccountsThisWeek = await prisma.account.count({
        where: { createdAt: { gte: weekStart } }
      });

      const newAccountsThisMonth = await prisma.account.count({
        where: { createdAt: { gte: monthStart } }
      });

      // Generate time series
      const accountGrowth = await this.generateTimeSeries(
        startDate, endDate, 'account', 'count'
      );
      const balanceGrowth = await this.generateTimeSeries(
        startDate, endDate, 'account', 'balance'
      );

      return {
        totalAccounts,
        activeAccounts,
        inactiveAccounts,
        totalBalance,
        averageBalance,
        medianBalance,
        accountsByType,
        balanceByType,
        newAccountsToday,
        newAccountsThisWeek,
        newAccountsThisMonth,
        accountGrowth,
        balanceGrowth,
      };
    } catch (error) {
      logger.error('Error calculating account metrics:', error);
      throw error;
    }
  }

  /**
   * Get user metrics
   */
  static async getUserMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<UserMetrics> {
    try {
      const totalUsers = await prisma.user.count();
      
      // Active users (simplified - using random data for demo)
      const activeUsers = Math.floor(totalUsers * 0.7);

      // New users in period
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Users by role
      const allUsers = await prisma.user.findMany({
        select: {
          role: true,
        },
      });

      const usersByRole = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<UserRole, number>);

      // Activity metrics (simplified)
      const dailyActiveUsers = Math.floor(activeUsers * 0.3);
      const weeklyActiveUsers = Math.floor(activeUsers * 0.6);
      const monthlyActiveUsers = activeUsers;

      // Login metrics (from audit logs)
      const loginAudits = await prisma.auditLog.findMany({
        where: {
          action: AuditAction.LOGIN,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalLogins = loginAudits.length;
      const uniqueLogins = new Set(loginAudits.map(log => log.userId)).size;

      // Generate time series
      const userGrowth = await this.generateTimeSeries(
        startDate, endDate, 'user', 'count'
      );
      const userActivity = await this.generateTimeSeries(
        startDate, endDate, 'audit', 'count', { action: AuditAction.LOGIN }
      );

      return {
        totalUsers,
        activeUsers,
        newUsers,
        usersByRole,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        totalLogins,
        uniqueLogins,
        averageSessionDuration: Math.random() * 1800 + 600, // 10-40 minutes
        userGrowth,
        userActivity,
      };
    } catch (error) {
      logger.error('Error calculating user metrics:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityMetrics> {
    try {
      // Get audit logs for security analysis
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Failed login attempts (simplified)
      const failedLoginAttempts = Math.floor(auditLogs.length * 0.05);

      // Group by action
      const auditLogsByAction = auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      // Group by resource
      const auditLogsByResource = auditLogs.reduce((acc, log) => {
        acc[log.resource] = (acc[log.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Security alert metrics (demo data)
      const totalSecurityAlerts = Math.floor(failedLoginAttempts * 0.1);
      const criticalAlerts = Math.floor(totalSecurityAlerts * 0.2);
      const resolvedAlerts = Math.floor(totalSecurityAlerts * 0.8);
      const pendingAlerts = totalSecurityAlerts - resolvedAlerts;

      const alertsByType = {
        'BRUTE_FORCE': Math.floor(totalSecurityAlerts * 0.4),
        'SUSPICIOUS_ACTIVITY': Math.floor(totalSecurityAlerts * 0.3),
        'UNUSUAL_ACCESS': Math.floor(totalSecurityAlerts * 0.2),
        'DATA_BREACH_ATTEMPT': Math.floor(totalSecurityAlerts * 0.1),
      };

      const alertsBySeverity = {
        'LOW': Math.floor(totalSecurityAlerts * 0.4),
        'MEDIUM': Math.floor(totalSecurityAlerts * 0.3),
        'HIGH': Math.floor(totalSecurityAlerts * 0.2),
        'CRITICAL': criticalAlerts,
      };

      const suspiciousIpAddresses = Math.floor(failedLoginAttempts * 0.3);
      const blockedAttempts = Math.floor(failedLoginAttempts * 0.1);

      // Generate time series
      const securityAlerts = await this.generateTimeSeries(
        startDate, endDate, 'audit', 'count', { resource: 'Security' }
      );
      const failedLogins = await this.generateTimeSeries(
        startDate, endDate, 'audit', 'count', { action: AuditAction.LOGIN }
      );

      return {
        totalSecurityAlerts,
        criticalAlerts,
        resolvedAlerts,
        pendingAlerts,
        alertsByType,
        alertsBySeverity,
        failedLoginAttempts,
        suspiciousIpAddresses,
        blockedAttempts,
        auditLogsByAction,
        auditLogsByResource,
        securityAlerts,
        failedLogins,
      };
    } catch (error) {
      logger.error('Error calculating security metrics:', error);
      throw error;
    }
  }

  /**
   * Get financial KPIs
   */
  static async getFinancialKPIs(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialKPIs> {
    try {
      // Get completed transactions with fees
      const completedTransactions = await prisma.transaction.findMany({
        where: {
          status: TransactionStatus.COMPLETED,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          fees: true,
        },
      });

      // Calculate revenue from fees
      const totalRevenue = completedTransactions.reduce((sum, transaction) => {
        const feeAmount = transaction.fees.reduce((feeSum, fee) => feeSum + Number(fee.amount), 0);
        return sum + feeAmount;
      }, 0);

      // Transaction volume
      const transactionVolume = completedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      // Revenue growth (demo calculation)
      const revenueGrowth = Math.random() * 20 - 10; // -10% to +10%
      const volumeGrowth = Math.random() * 15 - 5; // -5% to +10%

      // Other KPIs
      const averageTransactionFee = completedTransactions.length > 0 
        ? totalRevenue / completedTransactions.length 
        : 0;

      const feeRevenue = totalRevenue;
      const processingCosts = transactionVolume * 0.02; // 2% of volume

      // Risk metrics (demo data)
      const fraudulentTransactions = Math.floor(completedTransactions.length * 0.001);
      const chargebacks = Math.floor(completedTransactions.length * 0.002);
      const riskScore = Math.max(10, 100 - (fraudulentTransactions * 10));

      // Customer metrics (demo)
      const totalUsers = await prisma.user.count();
      const customerAcquisitionCost = totalUsers > 0 ? (processingCosts * 0.1) / totalUsers : 0;
      const customerLifetimeValue = totalUsers > 0 ? totalRevenue / totalUsers : 0;
      const churnRate = 2.5; // Fixed example rate

      return {
        totalRevenue,
        revenueGrowth,
        transactionVolume,
        volumeGrowth,
        averageTransactionFee,
        feeRevenue,
        processingCosts,
        fraudulentTransactions,
        chargebacks,
        riskScore,
        customerAcquisitionCost,
        customerLifetimeValue,
        churnRate,
      };
    } catch (error) {
      logger.error('Error calculating financial KPIs:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<{
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  }> {
    const startTime = process.uptime();
    
    return {
      uptime: startTime,
      responseTime: Math.random() * 100 + 50, // 50-150ms
      errorRate: Math.random() * 2, // 0-2%
      activeConnections: Math.floor(Math.random() * 100) + 20, // 20-120
    };
  }

  /**
   * Generate time series data
   */
  static async generateTimeSeries(
    startDate: Date,
    endDate: Date,
    table: 'transaction' | 'account' | 'user' | 'audit',
    metric: 'count' | 'amount' | 'balance',
    filters: any = {}
  ): Promise<BaseMetric[]> {
    try {
      const timeSeries: BaseMetric[] = [];
      const hoursDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const intervalHours = Math.max(1, Math.floor(hoursDiff / 24)); // Max 24 data points

      for (let i = 0; i < hoursDiff; i += intervalHours) {
        const intervalStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const intervalEnd = new Date(intervalStart.getTime() + intervalHours * 60 * 60 * 1000);

        let value = 0;

        // Build query based on table
        const whereClause = {
          createdAt: {
            gte: intervalStart,
            lt: intervalEnd,
          },
          ...filters,
        };

        switch (table) {
          case 'transaction':
            if (metric === 'count') {
              value = await prisma.transaction.count({ where: whereClause });
            } else if (metric === 'amount') {
              const result = await prisma.transaction.aggregate({
                where: whereClause,
                _sum: { amount: true },
              });
              value = Number(result._sum.amount) || 0;
            }
            break;

          case 'account':
            if (metric === 'count') {
              value = await prisma.account.count({ where: whereClause });
            }
            break;

          case 'user':
            if (metric === 'count') {
              value = await prisma.user.count({ where: whereClause });
            }
            break;

          case 'audit':
            if (metric === 'count') {
              value = await prisma.auditLog.count({ where: whereClause });
            }
            break;
        }

        const periodString = intervalStart.toISOString().split('T')[0] || intervalStart.toDateString();

        timeSeries.push({
          timestamp: intervalStart,
          value,
          period: periodString,
        });
      }

      return timeSeries;
    } catch (error) {
      logger.error('Error generating time series:', error);
      return [];
    }
  }

  /**
   * Helper method to get start date for time range
   */
  static getStartDateForRange(timeRange: TimeRange): Date {
    const now = new Date();
    
    switch (timeRange) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate median of number array
   */
  static calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      const left = sorted[middle - 1] ?? 0;
      const right = sorted[middle] ?? 0;
      return (left + right) / 2;
    }
    
    return sorted[middle] ?? 0;
  }
} 