import { Resolver, Query, Arg, Ctx, Authorized } from 'type-graphql';
import { MetricsService } from '../../services/metricsService';
import { TimeRange } from '../../types/analytics';
import { GraphQLContext } from '../../graphql/context';
import { logger } from '../../utils/logger';
import {
  DashboardDataType,
  TransactionMetricsType,
  AccountMetricsType,
  UserMetricsType,
  SecurityMetricsType,
  FinancialKPIsType,
  SystemHealthType,
} from '../../graphql/types/dashboardTypes';

/**
 * Dashboard GraphQL Resolver
 * Provides analytics and metrics data via GraphQL
 */
@Resolver()
export class DashboardResolver {
  /**
   * Get complete dashboard overview
   * Available to all authenticated users
   */
  @Authorized(['ADMIN'])
  @Query(() => DashboardDataType, {
    description: 'Get comprehensive dashboard metrics for specified time period (Admin only)'
  })
  async dashboardOverview(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<DashboardDataType> {
    try {
      const userId = context.user?.id;
      
      // Validate period
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period. Must be one of: hour, day, week, month, quarter, year');
      }

      const dashboardData = await MetricsService.getDashboardData(
        period as TimeRange,
        userId
      );

      logger.info('Dashboard overview requested via GraphQL', {
        userId,
        period,
        timestamp: dashboardData.timestamp,
      });

      return dashboardData;
    } catch (error: any) {
      logger.error('Error in dashboardOverview resolver:', error);
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }
  }

  /**
   * Get transaction metrics
   * Available to all authenticated users
   */
  @Authorized()
  @Query(() => TransactionMetricsType, {
    description: 'Get detailed transaction analytics and KPIs'
  })
  async transactionMetrics(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<TransactionMetricsType> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getTransactionMetrics(startDate, endDate);

      logger.info('Transaction metrics requested via GraphQL', {
        userId: context.user?.id,
        period,
      });

      return metrics;
    } catch (error: any) {
      logger.error('Error in transactionMetrics resolver:', error);
      throw new Error(`Failed to fetch transaction metrics: ${error.message}`);
    }
  }

  /**
   * Get account metrics
   * Available to admin users only
   */
  @Authorized(['ADMIN'])
  @Query(() => AccountMetricsType, {
    description: 'Get account analytics including growth and balance metrics (Admin only)'
  })
  async accountMetrics(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<AccountMetricsType> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getAccountMetrics(startDate, endDate);

      logger.info('Account metrics requested via GraphQL', {
        userId: context.user?.id,
        period,
      });

      return metrics;
    } catch (error: any) {
      logger.error('Error in accountMetrics resolver:', error);
      throw new Error(`Failed to fetch account metrics: ${error.message}`);
    }
  }

  /**
   * Get user metrics
   * Available to admin users only
   */
  @Authorized(['ADMIN'])
  @Query(() => UserMetricsType, {
    description: 'Get user analytics including activity and growth metrics (Admin only)'
  })
  async userMetrics(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<UserMetricsType> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getUserMetrics(startDate, endDate);

      logger.info('User metrics requested via GraphQL', {
        userId: context.user?.id,
        userRole: context.user?.role,
        period,
      });

      return metrics;
    } catch (error: any) {
      logger.error('Error in userMetrics resolver:', error);
      throw new Error(`Failed to fetch user metrics: ${error.message}`);
    }
  }

  /**
   * Get security metrics
   * Available to admin users only
   */
  @Authorized(['ADMIN'])
  @Query(() => SecurityMetricsType, {
    description: 'Get security analytics including alerts and threats (Admin only)'
  })
  async securityMetrics(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<SecurityMetricsType> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getSecurityMetrics(startDate, endDate);

      logger.info('Security metrics requested via GraphQL', {
        userId: context.user?.id,
        userRole: context.user?.role,
        period,
      });

      return metrics;
    } catch (error: any) {
      logger.error('Error in securityMetrics resolver:', error);
      throw new Error(`Failed to fetch security metrics: ${error.message}`);
    }
  }

  /**
   * Get financial KPIs
   * Available to admin users only
   */
  @Authorized(['ADMIN'])
  @Query(() => FinancialKPIsType, {
    description: 'Get financial key performance indicators and revenue metrics (Admin only)'
  })
  async financialKPIs(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<FinancialKPIsType> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const kpis = await MetricsService.getFinancialKPIs(startDate, endDate);

      logger.info('Financial KPIs requested via GraphQL', {
        userId: context.user?.id,
        userRole: context.user?.role,
        period,
      });

      return kpis;
    } catch (error: any) {
      logger.error('Error in financialKPIs resolver:', error);
      throw new Error(`Failed to fetch financial KPIs: ${error.message}`);
    }
  }

  /**
   * Get system health
   * Available to admin users only
   */
  @Authorized(['ADMIN'])
  @Query(() => SystemHealthType, {
    description: 'Get real-time system performance and health metrics (Admin only)'
  })
  async systemHealth(
    @Ctx() context: GraphQLContext
  ): Promise<SystemHealthType> {
    try {
      const health = await MetricsService.getSystemHealth();

      logger.info('System health requested via GraphQL', {
        userId: context.user?.id,
        userRole: context.user?.role,
      });

      return health;
    } catch (error: any) {
      logger.error('Error in systemHealth resolver:', error);
      throw new Error(`Failed to fetch system health: ${error.message}`);
    }
  }

  /**
   * Get transaction volume time series
   * Optimized query for charts
   */
  @Authorized(['ADMIN'])
  @Query(() => [Number], {
    description: 'Get transaction volume time series data for charts (Admin only)'
  })
  async transactionVolumeChart(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<number[]> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const timeSeries = await MetricsService.generateTimeSeries(
        startDate, 
        endDate, 
        'transaction', 
        'count'
      );

      logger.info('Transaction volume chart data requested via GraphQL', {
        userId: context.user?.id,
        period,
        dataPoints: timeSeries.length,
      });

      return timeSeries.map(point => point.value);
    } catch (error: any) {
      logger.error('Error in transactionVolumeChart resolver:', error);
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }
  }

  /**
   * Get account growth time series
   * Optimized query for charts
   */
  @Authorized(['ADMIN'])
  @Query(() => [Number], {
    description: 'Get account growth time series data for charts (Admin only)'
  })
  async accountGrowthChart(
    @Arg('period', { defaultValue: 'day' }) period: string,
    @Ctx() context: GraphQLContext
  ): Promise<number[]> {
    try {
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new Error('Invalid time period');
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const timeSeries = await MetricsService.generateTimeSeries(
        startDate, 
        endDate, 
        'account', 
        'count'
      );

      logger.info('Account growth chart data requested via GraphQL', {
        userId: context.user?.id,
        period,
        dataPoints: timeSeries.length,
      });

      return timeSeries.map(point => point.value);
    } catch (error: any) {
      logger.error('Error in accountGrowthChart resolver:', error);
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }
  }
} 