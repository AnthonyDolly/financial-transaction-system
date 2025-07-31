/**
 * @swagger
 * components:
 *   schemas:
 *     TransactionRequest:
 *       type: object
 *       required:
 *         - fromAccountId
 *         - toAccountId
 *         - amount
 *       properties:
 *         fromAccountId:
 *           type: string
 *           example: "cmddybmu90005vt4ghd8frbqj"
 *         toAccountId:
 *           type: string
 *           example: "cmddybmub0007vt4g9c57c5so"
 *         amount:
 *           type: number
 *           example: 500.00
 *         description:
 *           type: string
 *           example: "Payment for services"
 *         reference:
 *           type: string
 *           example: "INV-2024-001"
 *         type:
 *           type: string
 *           enum: [TRANSFER, TRANSFER_IN, TRANSFER_OUT, DEPOSIT, WITHDRAWAL, FEE, REFUND, REVERSAL, SCHEDULED_PAYMENT, INTEREST_PAYMENT]
 *           example: "TRANSFER"
 *
 *     TransactionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         fromAccountId:
 *           type: string
 *         toAccountId:
 *           type: string
 *         amount:
 *           type: number
 *         fee:
 *           type: number
 *         netAmount:
 *           type: number
 *         description:
 *           type: string
 *         reference:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REVERSED, EXPIRED]
 *         type:
 *           type: string
 *           enum: [TRANSFER, TRANSFER_IN, TRANSFER_OUT, DEPOSIT, WITHDRAWAL, FEE, REFUND, REVERSAL, SCHEDULED_PAYMENT, INTEREST_PAYMENT]
 *         externalRef:
 *           type: string
 *         processingTime:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         failedReason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         fromAccount:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             userId:
 *               type: string
 *             currency:
 *               type: string
 *         toAccount:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             userId:
 *               type: string
 *             currency:
 *               type: string
 *
 *     TransactionValidation:
 *       type: object
 *       properties:
 *         isValid:
 *           type: boolean
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *         warnings:
 *           type: array
 *           items:
 *             type: string
 *         estimatedFee:
 *           type: number
 *         limitInfo:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               limitType:
 *                 type: string
 *               limitPeriod:
 *                 type: string
 *               totalLimit:
 *                 type: number
 *               usedAmount:
 *                 type: number
 *               remainingAmount:
 *                 type: number
 *               resetAt:
 *                 type: string
 *                 format: date-time
 *
 * /api/v1/transactions/validate:
 *   post:
 *     summary: Validate a transaction before processing
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       200:
 *         description: Transaction validation result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionValidation'
 *
 * /api/v1/transactions:
 *   post:
 *     summary: Process a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       201:
 *         description: Transaction processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid transaction data or insufficient funds
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionResponse'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 *
 * /api/v1/transactions/my:
 *   get:
 *     summary: Get my transactions
 *     tags: [Transactions]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REVERSED, EXPIRED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TRANSFER, TRANSFER_IN, TRANSFER_OUT, DEPOSIT, WITHDRAWAL, FEE, REFUND, REVERSAL, SCHEDULED_PAYMENT, INTEREST_PAYMENT]
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
 *         description: Transactions retrieved successfully
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
 *                         $ref: '#/components/schemas/TransactionResponse'
 *
 * /api/v1/transactions/{id}/reverse:
 *   post:
 *     summary: Reverse a transaction (Admin only)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID to reverse
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
 *                 example: "Customer dispute resolved in their favor"
 *     responses:
 *       200:
 *         description: Transaction reversed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Cannot reverse transaction
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Transaction not found
 */ 