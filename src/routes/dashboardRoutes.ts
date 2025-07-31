import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboards
 *   description: Dashboard and metrics endpoints
 */

// Apply authentication to all dashboard routes
router.use(authenticate());

/**
 * Dashboard Overview
 * GET /api/v1/dashboards/overview
 */
router.get('/overview', DashboardController.getOverview);

/**
 * Transaction Metrics
 * GET /api/v1/dashboards/transactions
 */
router.get('/transactions', DashboardController.getTransactionMetrics);

/**
 * Account Metrics
 * GET /api/v1/dashboards/accounts
 */
router.get('/accounts', DashboardController.getAccountMetrics);

/**
 * User Metrics
 * GET /api/v1/dashboards/users
 * Requires ADMIN role
 */
router.get('/users', authorize(['ADMIN']), DashboardController.getUserMetrics);

/**
 * Security Metrics
 * GET /api/v1/dashboards/security
 * Requires ADMIN role
 */
router.get('/security', authorize(['ADMIN']), DashboardController.getSecurityMetrics);

/**
 * Financial KPIs
 * GET /api/v1/dashboards/financial
 * Requires ADMIN role
 */
router.get('/financial', authorize(['ADMIN']), DashboardController.getFinancialKPIs);

/**
 * System Health
 * GET /api/v1/dashboards/system-health
 * Requires ADMIN role
 */
router.get('/system-health', authorize(['ADMIN']), DashboardController.getSystemHealth);

export default router; 