import { TransactionType, TransactionStatus, UserRole, AuditAction } from '@prisma/client';

/**
 * Time Range Options for Analytics
 */
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type MetricInterval = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Base Metric Interface
 */
export interface BaseMetric {
  timestamp: Date;
  value: number;
  period: string;
}

/**
 * Transaction Metrics
 */
export interface TransactionMetrics {
  // Volume Metrics
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  
  // Transaction Types
  transactionsByType: Record<TransactionType, number>;
  amountsByType: Record<TransactionType, number>;
  
  // Transaction Status
  transactionsByStatus: Record<TransactionStatus, number>;
  
  // Success Rates
  successRate: number; // percentage of completed transactions
  failureRate: number; // percentage of failed transactions
  
  // Processing Time
  averageProcessingTime: number; // in milliseconds
  medianProcessingTime: number;
  
  // Time Series Data
  transactionVolume: BaseMetric[]; // transactions over time
  transactionAmount: BaseMetric[]; // amount over time
}

/**
 * Account Metrics
 */
export interface AccountMetrics {
  // Account Overview
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  
  // Balance Distribution
  totalBalance: number;
  averageBalance: number;
  medianBalance: number;
  
  // Account Types
  accountsByType: Record<string, number>;
  balanceByType: Record<string, number>;
  
  // Growth Metrics
  newAccountsToday: number;
  newAccountsThisWeek: number;
  newAccountsThisMonth: number;
  
  // Time Series
  accountGrowth: BaseMetric[];
  balanceGrowth: BaseMetric[];
}

/**
 * User Metrics
 */
export interface UserMetrics {
  // User Overview
  totalUsers: number;
  activeUsers: number; // users with activity in last 30 days
  newUsers: number; // new users in selected period
  
  // User Roles
  usersByRole: Record<UserRole, number>;
  
  // Activity Metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  
  // Login Activity
  totalLogins: number;
  uniqueLogins: number;
  averageSessionDuration: number;
  
  // Time Series
  userGrowth: BaseMetric[];
  userActivity: BaseMetric[];
}

/**
 * Security Metrics
 */
export interface SecurityMetrics {
  // Security Events
  totalSecurityAlerts: number;
  criticalAlerts: number;
  resolvedAlerts: number;
  pendingAlerts: number;
  
  // Alert Types
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  
  // Login Security
  failedLoginAttempts: number;
  suspiciousIpAddresses: number;
  blockedAttempts: number;
  
  // Audit Activity
  auditLogsByAction: Record<AuditAction, number>;
  auditLogsByResource: Record<string, number>;
  
  // Time Series
  securityAlerts: BaseMetric[];
  failedLogins: BaseMetric[];
}

/**
 * Financial KPIs
 */
export interface FinancialKPIs {
  // Revenue Metrics
  totalRevenue: number; // from fees
  revenueGrowth: number; // percentage change
  
  // Volume Metrics
  transactionVolume: number;
  volumeGrowth: number;
  
  // Efficiency Metrics
  averageTransactionFee: number;
  feeRevenue: number;
  processingCosts: number;
  
  // Risk Metrics
  fraudulentTransactions: number;
  chargebacks: number;
  riskScore: number; // 0-100
  
  // Customer Metrics
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  churnRate: number;
}

/**
 * Real-time Dashboard Data
 */
export interface DashboardData {
  // Overview
  timestamp: Date;
  period: TimeRange;
  
  // Core Metrics
  transactions: TransactionMetrics;
  accounts: AccountMetrics;
  users: UserMetrics;
  security: SecurityMetrics;
  kpis: FinancialKPIs;
  
  // System Health
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

/**
 * Report Configuration
 */
export interface ReportConfig {
  type: 'transaction' | 'financial' | 'security' | 'compliance' | 'user';
  period: TimeRange;
  startDate: Date;
  endDate: Date;
  includeCharts: boolean;
  format: 'pdf' | 'excel' | 'json' | 'csv';
  filters?: {
    userIds?: string[];
    accountIds?: string[];
    transactionTypes?: TransactionType[];
    minAmount?: number;
    maxAmount?: number;
  };
}

/**
 * Generated Report
 */
export interface GeneratedReport {
  id: string;
  type: ReportConfig['type'];
  config: ReportConfig;
  data: any;
  generatedAt: Date;
  generatedBy: string;
  downloadUrl?: string;
  expiresAt: Date;
}

/**
 * Chart Data Structures
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface PieChartData {
  labels: string[];
  data: number[];
  backgroundColor: string[];
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }>;
}

/**
 * Metric Aggregation Options
 */
export interface AggregationOptions {
  timeRange: TimeRange;
  interval: MetricInterval;
  groupBy?: string[];
  filters?: Record<string, any>;
  includeComparison?: boolean; // compare with previous period
}

/**
 * Comparison Data
 */
export interface ComparisonData<T> {
  current: T;
  previous: T;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
}

/**
 * Alert Configuration
 */
export interface MetricAlert {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  enabled: boolean;
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
  };
  cooldown: number; // minutes between alerts
  lastTriggered?: Date;
} 