import { Request, Response } from 'express';
import { MetricsService } from '../services/metricsService';
import { TimeRange } from '../types/analytics';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appError';

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardData:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the data was generated
 *         period:
 *           type: string
 *           enum: [hour, day, week, month, quarter, year]
 *           description: Time period for the metrics
 *         transactions:
 *           $ref: '#/components/schemas/TransactionMetrics'
 *         accounts:
 *           $ref: '#/components/schemas/AccountMetrics'
 *         users:
 *           $ref: '#/components/schemas/UserMetrics'
 *         security:
 *           $ref: '#/components/schemas/SecurityMetrics'
 *         kpis:
 *           $ref: '#/components/schemas/FinancialKPIs'
 *         systemHealth:
 *           $ref: '#/components/schemas/SystemHealth'
 *     
 *     TransactionMetrics:
 *       type: object
 *       properties:
 *         totalTransactions:
 *           type: number
 *         totalAmount:
 *           type: number
 *         averageAmount:
 *           type: number
 *         successRate:
 *           type: number
 *           description: Percentage of successful transactions
 *         failureRate:
 *           type: number
 *           description: Percentage of failed transactions
 *     
 *     AccountMetrics:
 *       type: object
 *       properties:
 *         totalAccounts:
 *           type: number
 *         activeAccounts:
 *           type: number
 *         totalBalance:
 *           type: number
 *         averageBalance:
 *           type: number
 *     
 *     UserMetrics:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: number
 *         activeUsers:
 *           type: number
 *         newUsers:
 *           type: number
 *         dailyActiveUsers:
 *           type: number
 *     
 *     SecurityMetrics:
 *       type: object
 *       properties:
 *         totalSecurityAlerts:
 *           type: number
 *         criticalAlerts:
 *           type: number
 *         failedLoginAttempts:
 *           type: number
 *         suspiciousIpAddresses:
 *           type: number
 *     
 *     FinancialKPIs:
 *       type: object
 *       properties:
 *         totalRevenue:
 *           type: number
 *         revenueGrowth:
 *           type: number
 *           description: Percentage growth
 *         transactionVolume:
 *           type: number
 *         volumeGrowth:
 *           type: number
 *           description: Percentage growth
 *     
 *     SystemHealth:
 *       type: object
 *       properties:
 *         uptime:
 *           type: number
 *         responseTime:
 *           type: number
 *         errorRate:
 *           type: number
 *         activeConnections:
 *           type: number
 */

export class DashboardController {
  /**
   * @swagger
   * /api/v1/dashboards/overview:
   *   get:
   *     summary: Get complete dashboard overview
   *     description: Returns comprehensive metrics for the main dashboard
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: Dashboard data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DashboardData'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      const userId = (req as any).user?.id;

      // Validate period
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const dashboardData = await MetricsService.getDashboardData(
        period as TimeRange,
        userId
      );

      logger.info('Dashboard overview requested', {
        userId,
        period,
        timestamp: dashboardData.timestamp,
      });

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error: any) {
      logger.error('Error getting dashboard overview:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/transactions:
   *   get:
   *     summary: Get transaction metrics
   *     description: Returns detailed transaction analytics and KPIs
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: Transaction metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/TransactionMetrics'
   */
  static async getTransactionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getTransactionMetrics(startDate, endDate);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Error getting transaction metrics:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/accounts:
   *   get:
   *     summary: Get account metrics
   *     description: Returns detailed account analytics and growth metrics
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: Account metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AccountMetrics'
   */
  static async getAccountMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getAccountMetrics(startDate, endDate);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Error getting account metrics:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/users:
   *   get:
   *     summary: Get user metrics
   *     description: Returns user analytics including activity and growth metrics
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: User metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserMetrics'
   */
  static async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getUserMetrics(startDate, endDate);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Error getting user metrics:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/security:
   *   get:
   *     summary: Get security metrics
   *     description: Returns security analytics including alerts and threats
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: Security metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SecurityMetrics'
   */
  static async getSecurityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const metrics = await MetricsService.getSecurityMetrics(startDate, endDate);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Error getting security metrics:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/financial:
   *   get:
   *     summary: Get financial KPIs
   *     description: Returns financial key performance indicators and revenue metrics
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month, quarter, year]
   *           default: day
   *         description: Time period for metrics
   *     responses:
   *       200:
   *         description: Financial KPIs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/FinancialKPIs'
   */
  static async getFinancialKPIs(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const startDate = MetricsService.getStartDateForRange(period as TimeRange);
      const endDate = new Date();
      
      const kpis = await MetricsService.getFinancialKPIs(startDate, endDate);

      res.json({
        success: true,
        data: kpis,
      });
    } catch (error: any) {
      logger.error('Error getting financial KPIs:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/dashboards/system-health:
   *   get:
   *     summary: Get system health metrics
   *     description: Returns real-time system performance and health metrics
   *     tags: [Dashboards]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System health retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SystemHealth'
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await MetricsService.getSystemHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error: any) {
      logger.error('Error getting system health:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 