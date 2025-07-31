/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         userId:
 *           type: string
 *           example: "cmddybmu40000vt4g734qx48k"
 *         balance:
 *           type: number
 *           example: 1500.50
 *         currency:
 *           type: string
 *           example: "USD"
 *         isActive:
 *           type: boolean
 *           example: true
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
 *             role:
 *               type: string
 *               enum: [USER, ADMIN]
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         accountId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT]
 *         amount:
 *           type: number
 *           example: 500.00
 *         balance:
 *           type: number
 *           example: 1500.50
 *         description:
 *           type: string
 *         reference:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         relatedAccountId:
 *           type: string
 *         metadata:
 *           type: object
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Request successful"
 *         data:
 *           type: object
 *           nullable: true
 *           description: Response payload (varies by endpoint)
 *
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Request successful"
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         totalPages:
 *           type: integer
 *           example: 5
 *         totalItems:
 *           type: integer
 *           example: 100
 *         data:
 *           type: array
 *           items:
 *             type: object
 *           description: Paginated data array
 *
 * /api/v1/accounts/me:
 *   get:
 *     summary: Get my account information
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/me/balance:
 *   get:
 *     summary: Get my account balance
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account balance retrieved successfully
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
 *                         accountId:
 *                           type: string
 *                         balance:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         availableBalance:
 *                           type: number
 *                         pendingTransactions:
 *                           type: number
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *
 * /api/v1/accounts/me/deposit:
 *   post:
 *     summary: Deposit money to my account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - source
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000.00
 *               description:
 *                 type: string
 *                 example: "Salary deposit"
 *               reference:
 *                 type: string
 *                 example: "PAY-2024-001"
 *               source:
 *                 type: string
 *                 enum: [bank_transfer, cash, check, online, other]
 *                 example: "bank_transfer"
 *     responses:
 *       200:
 *         description: Deposit completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/me/withdraw:
 *   post:
 *     summary: Withdraw money from my account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 200.00
 *               description:
 *                 type: string
 *                 example: "ATM withdrawal"
 *               reference:
 *                 type: string
 *                 example: "ATM-001-2024"
 *               method:
 *                 type: string
 *                 enum: [atm, bank_counter, online, check, other]
 *                 example: "atm"
 *     responses:
 *       200:
 *         description: Withdrawal completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Insufficient funds
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/me/statement:
 *   get:
 *     summary: Get my account statement (transaction history)
 *     tags: [Accounts]
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description or reference
 *     responses:
 *       200:
 *         description: Account statement retrieved successfully
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
 *                         $ref: '#/components/schemas/Transaction'
 *
 * /api/v1/accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/{id}/balance:
 *   get:
 *     summary: Get account balance
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account balance retrieved successfully
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
 *                         accountId:
 *                           type: string
 *                         balance:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         availableBalance:
 *                           type: number
 *                         pendingTransactions:
 *                           type: number
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *
 * /api/v1/accounts/transfer:
 *   post:
 *     summary: Transfer money between accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccountId
 *               - toAccountId
 *               - amount
 *             properties:
 *               fromAccountId:
 *                 type: string
 *                 example: "cmddybmu90005vt4ghd8frbqj"
 *               toAccountId:
 *                 type: string
 *                 example: "cmddybmub0007vt4g9c57c5so"
 *               amount:
 *                 type: number
 *                 example: 500.00
 *               description:
 *                 type: string
 *                 example: "Payment for services"
 *               reference:
 *                 type: string
 *                 example: "INV-2024-001"
 *     responses:
 *       200:
 *         description: Transfer completed successfully
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
 *                         transaction:
 *                           $ref: '#/components/schemas/Transaction'
 *                         fromAccount:
 *                           $ref: '#/components/schemas/Account'
 *                         toAccount:
 *                           $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid request or insufficient funds
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/{id}/deposit:
 *   post:
 *     summary: Deposit money to account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - source
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000.00
 *               description:
 *                 type: string
 *                 example: "Salary deposit"
 *               reference:
 *                 type: string
 *                 example: "PAY-2024-001"
 *               source:
 *                 type: string
 *                 enum: [bank_transfer, cash, check, online, other]
 *                 example: "bank_transfer"
 *     responses:
 *       200:
 *         description: Deposit completed successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/{id}/withdraw:
 *   post:
 *     summary: Withdraw money from account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 200.00
 *               description:
 *                 type: string
 *                 example: "ATM withdrawal"
 *               reference:
 *                 type: string
 *                 example: "ATM-001-2024"
 *               method:
 *                 type: string
 *                 enum: [atm, bank_counter, online, check, other]
 *                 example: "atm"
 *     responses:
 *       200:
 *         description: Withdrawal completed successfully
 *       400:
 *         description: Insufficient funds
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/{id}/statement:
 *   get:
 *     summary: Get account statement (transaction history)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT]
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description or reference
 *     responses:
 *       200:
 *         description: Account statement retrieved successfully
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
 *                         $ref: '#/components/schemas/Transaction'
 *
 * /api/v1/accounts/{id}/freeze:
 *   post:
 *     summary: Freeze account (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Suspicious activity detected"
 *               duration:
 *                 type: number
 *                 description: Duration in days
 *                 example: 30
 *               notifyUser:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Account frozen successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/{id}/unfreeze:
 *   post:
 *     summary: Unfreeze account (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Investigation completed, no issues found"
 *               notifyUser:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Account unfrozen successfully
 *       400:
 *         description: Account is already active
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Account not found
 *
 * /api/v1/accounts/stats:
 *   get:
 *     summary: Get account statistics (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account statistics retrieved successfully
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
 *                         totalBalance:
 *                           type: number
 *                         totalAccounts:
 *                           type: number
 *                         activeAccounts:
 *                           type: number
 *                         inactiveAccounts:
 *                           type: number
 *                         totalTransactions:
 *                           type: number
 *                         totalDeposits:
 *                           type: number
 *                         totalWithdrawals:
 *                           type: number
 *                         averageBalance:
 *                           type: number
 *                         currency:
 *                           type: string
 */ 