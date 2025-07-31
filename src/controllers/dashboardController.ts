import { Request, Response } from 'express';
import { MetricsService } from '../services/metricsService';
import { TimeRange } from '../types/analytics';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appError';

export class DashboardController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      const userId = (req as any).user?.id;

      // Validate period
      const validPeriods: TimeRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as TimeRange)) {
        throw new AppError('Invalid time period', 400);
      }

      const dashboardData = await MetricsService.getDashboardData(period as TimeRange, userId);

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
