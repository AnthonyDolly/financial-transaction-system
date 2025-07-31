import { ObjectType, Field, Float, Int, GraphQLISODateTime } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

/**
 * Base Metric Type
 */
@ObjectType()
export class BaseMetricType {
  @Field(() => GraphQLISODateTime)
  timestamp!: Date;

  @Field(() => Float)
  value!: number;

  @Field(() => String)
  period!: string;
}

/**
 * Transaction Metrics Type
 */
@ObjectType()
export class TransactionMetricsType {
  @Field(() => Int)
  totalTransactions!: number;

  @Field(() => Float)
  totalAmount!: number;

  @Field(() => Float)
  averageAmount!: number;

  @Field(() => GraphQLJSONObject)
  transactionsByType!: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  amountsByType!: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  transactionsByStatus!: Record<string, number>;

  @Field(() => Float)
  successRate!: number;

  @Field(() => Float)
  failureRate!: number;

  @Field(() => Float)
  averageProcessingTime!: number;

  @Field(() => Float)
  medianProcessingTime!: number;

  @Field(() => [BaseMetricType])
  transactionVolume!: BaseMetricType[];

  @Field(() => [BaseMetricType])
  transactionAmount!: BaseMetricType[];
}

/**
 * Account Metrics Type
 */
@ObjectType()
export class AccountMetricsType {
  @Field(() => Int)
  totalAccounts!: number;

  @Field(() => Int)
  activeAccounts!: number;

  @Field(() => Int)
  inactiveAccounts!: number;

  @Field(() => Float)
  totalBalance!: number;

  @Field(() => Float)
  averageBalance!: number;

  @Field(() => Float)
  medianBalance!: number;

  @Field(() => GraphQLJSONObject)
  accountsByType!: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  balanceByType!: Record<string, number>;

  @Field(() => Int)
  newAccountsToday!: number;

  @Field(() => Int)
  newAccountsThisWeek!: number;

  @Field(() => Int)
  newAccountsThisMonth!: number;

  @Field(() => [BaseMetricType])
  accountGrowth!: BaseMetricType[];

  @Field(() => [BaseMetricType])
  balanceGrowth!: BaseMetricType[];
}

/**
 * User Metrics Type
 */
@ObjectType()
export class UserMetricsType {
  @Field(() => Int)
  totalUsers!: number;

  @Field(() => Int)
  activeUsers!: number;

  @Field(() => Int)
  newUsers!: number;

  @Field(() => GraphQLJSONObject)
  usersByRole!: Record<string, number>;

  @Field(() => Int)
  dailyActiveUsers!: number;

  @Field(() => Int)
  weeklyActiveUsers!: number;

  @Field(() => Int)
  monthlyActiveUsers!: number;

  @Field(() => Int)
  totalLogins!: number;

  @Field(() => Int)
  uniqueLogins!: number;

  @Field(() => Float)
  averageSessionDuration!: number;

  @Field(() => [BaseMetricType])
  userGrowth!: BaseMetricType[];

  @Field(() => [BaseMetricType])
  userActivity!: BaseMetricType[];
}

/**
 * Security Metrics Type
 */
@ObjectType()
export class SecurityMetricsType {
  @Field(() => Int)
  totalSecurityAlerts!: number;

  @Field(() => Int)
  criticalAlerts!: number;

  @Field(() => Int)
  resolvedAlerts!: number;

  @Field(() => Int)
  pendingAlerts!: number;

  @Field(() => GraphQLJSONObject)
  alertsByType!: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  alertsBySeverity!: Record<string, number>;

  @Field(() => Int)
  failedLoginAttempts!: number;

  @Field(() => Int)
  suspiciousIpAddresses!: number;

  @Field(() => Int)
  blockedAttempts!: number;

  @Field(() => GraphQLJSONObject)
  auditLogsByAction!: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  auditLogsByResource!: Record<string, number>;

  @Field(() => [BaseMetricType])
  securityAlerts!: BaseMetricType[];

  @Field(() => [BaseMetricType])
  failedLogins!: BaseMetricType[];
}

/**
 * Financial KPIs Type
 */
@ObjectType()
export class FinancialKPIsType {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  revenueGrowth!: number;

  @Field(() => Float)
  transactionVolume!: number;

  @Field(() => Float)
  volumeGrowth!: number;

  @Field(() => Float)
  averageTransactionFee!: number;

  @Field(() => Float)
  feeRevenue!: number;

  @Field(() => Float)
  processingCosts!: number;

  @Field(() => Int)
  fraudulentTransactions!: number;

  @Field(() => Int)
  chargebacks!: number;

  @Field(() => Float)
  riskScore!: number;

  @Field(() => Float)
  customerAcquisitionCost!: number;

  @Field(() => Float)
  customerLifetimeValue!: number;

  @Field(() => Float)
  churnRate!: number;
}

/**
 * System Health Type
 */
@ObjectType()
export class SystemHealthType {
  @Field(() => Float)
  uptime!: number;

  @Field(() => Float)
  responseTime!: number;

  @Field(() => Float)
  errorRate!: number;

  @Field(() => Int)
  activeConnections!: number;
}

/**
 * Complete Dashboard Data Type
 */
@ObjectType()
export class DashboardDataType {
  @Field(() => GraphQLISODateTime)
  timestamp!: Date;

  @Field(() => String)
  period!: string;

  @Field(() => TransactionMetricsType)
  transactions!: TransactionMetricsType;

  @Field(() => AccountMetricsType)
  accounts!: AccountMetricsType;

  @Field(() => UserMetricsType)
  users!: UserMetricsType;

  @Field(() => SecurityMetricsType)
  security!: SecurityMetricsType;

  @Field(() => FinancialKPIsType)
  kpis!: FinancialKPIsType;

  @Field(() => SystemHealthType)
  systemHealth!: SystemHealthType;
}

/**
 * Chart Data Types
 */
@ObjectType()
export class ChartDatasetType {
  @Field(() => String)
  label!: string;

  @Field(() => [Float])
  data!: number[];

  @Field(() => String, { nullable: true })
  backgroundColor?: string;

  @Field(() => String, { nullable: true })
  borderColor?: string;

  @Field(() => Int, { nullable: true })
  borderWidth?: number;
}

@ObjectType()
export class ChartDataType {
  @Field(() => [String])
  labels!: string[];

  @Field(() => [ChartDatasetType])
  datasets!: ChartDatasetType[];
}

@ObjectType()
export class PieChartDataType {
  @Field(() => [String])
  labels!: string[];

  @Field(() => [Float])
  data!: number[];

  @Field(() => [String])
  backgroundColor!: string[];
}

/**
 * Time Range Enum
 */
export enum TimeRangeEnum {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
} 