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
 *           type: integer
 *           format: int64
 *         totalAmount:
 *           type: number
 *           format: double
 *         averageAmount:
 *           type: number
 *           format: double
 *         successRate:
 *           type: number
 *           format: float
 *           description: Percentage of successful transactions
 *         failureRate:
 *           type: number
 *           format: float
 *           description: Percentage of failed transactions
 *     
 *     AccountMetrics:
 *       type: object
 *       properties:
 *         totalAccounts:
 *           type: integer
 *           format: int64
 *         activeAccounts:
 *           type: integer
 *           format: int64
 *         totalBalance:
 *           type: number
 *           format: double
 *         averageBalance:
 *           type: number
 *           format: double
 *     
 *     UserMetrics:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: integer
 *           format: int64
 *         activeUsers:
 *           type: integer
 *           format: int64
 *         newUsers:
 *           type: integer
 *           format: int64
 *         dailyActiveUsers:
 *           type: integer
 *           format: int64
 *     
 *     SecurityMetrics:
 *       type: object
 *       properties:
 *         totalSecurityAlerts:
 *           type: integer
 *           format: int64
 *         criticalAlerts:
 *           type: integer
 *           format: int64
 *         failedLoginAttempts:
 *           type: integer
 *           format: int64
 *         suspiciousIpAddresses:
 *           type: integer
 *           format: int64
 *     
 *     FinancialKPIs:
 *       type: object
 *       properties:
 *         totalRevenue:
 *           type: number
 *           format: double
 *         revenueGrowth:
 *           type: number
 *           format: float
 *           description: Percentage growth
 *         transactionVolume:
 *           type: integer
 *           format: int64
 *         volumeGrowth:
 *           type: number
 *           format: float
 *           description: Percentage growth
 *     
 *     SystemHealth:
 *       type: object
 *       properties:
 *         uptime:
 *           type: number
 *           format: float
 *         responseTime:
 *           type: number
 *           format: float
 *         errorRate:
 *           type: number
 *           format: float
 *         activeConnections:
 *           type: integer
 *           format: int64
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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