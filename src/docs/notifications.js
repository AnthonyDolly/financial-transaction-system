/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         accountId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         transactionId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *           example: "TRANSACTION_COMPLETED"
 *         title:
 *           type: string
 *           example: "Transaction Completed"
 *         message:
 *           type: string
 *           example: "Your transaction has been processed successfully"
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *           example: "MEDIUM"
 *         channel:
 *           type: string
 *           enum: [IN_APP, EMAIL, SMS, PUSH]
 *           example: "IN_APP"
 *         metadata:
 *           type: object
 *           example: {"amount": "100.00", "reference": "TXN-001"}
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *
 *     NotificationResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         accountId:
 *           type: string
 *         transactionId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         channel:
 *           type: string
 *           enum: [IN_APP, EMAIL, SMS, PUSH]
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *
 *     NotificationStats:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *         unread:
 *           type: number
 *         byType:
 *           type: object
 *           additionalProperties:
 *             type: number
 *         byPriority:
 *           type: object
 *           additionalProperties:
 *             type: number
 *
 *     SystemNotificationRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - message
 *       properties:
 *         type:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         metadata:
 *           type: object
 *         userRole:
 *           type: string
 *           enum: [USER, ADMIN]
 *           description: Target specific user role (optional)
 *
 * /api/v1/notifications:
 *   get:
 *     summary: Get current user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Get only unread notifications
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TRANSACTION_COMPLETED, TRANSACTION_FAILED, ACCOUNT_FROZEN, ACCOUNT_UNFROZEN, LOW_BALANCE, HIGH_BALANCE, LIMIT_REACHED, SCHEDULED_PAYMENT, SECURITY_ALERT, SYSTEM_MAINTENANCE]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/NotificationResponse'
 *   post:
 *     summary: Create a new notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationResponse'
 *       400:
 *         description: Bad request - validation failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               error: "VALIDATION_ERROR"
 *               details:
 *                 field: "title"
 *                 message: "Title is required"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Unauthorized access"
 *               error: "UNAUTHORIZED"
 *               details:
 *                 message: "Invalid or missing authentication token"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *       403:
 *         description: Admin access required
 *
 * /api/v1/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *
 * /api/v1/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                           description: Number of notifications marked as read
 *
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *
 * /api/v1/notifications/stats:
 *   get:
 *     summary: Get notification statistics
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationStats'
 *
 * /api/v1/notifications/system:
 *   post:
 *     summary: Send system-wide notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SystemNotificationRequest'
 *     responses:
 *       200:
 *         description: System notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                           description: Number of users who received the notification
 *       403:
 *         description: Admin access required
 *
 * /api/v1/notifications/cleanup:
 *   post:
 *     summary: Clean up expired notifications (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired notifications cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deletedCount:
 *                           type: number
 *                           description: Number of expired notifications deleted
 *       403:
 *         description: Admin access required
 */ 