import {
  TransactionStatus,
  TransactionType,
  LimitType,
  LimitPeriod,
  FeeType,
  NotificationType,
  AuditAction,
} from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { PaginatedResponse, PaginationMeta } from '../types/api';

export interface TransactionRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
  type?: TransactionType;
  scheduledFor?: Date;
}

export interface TransactionResponse {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee: number;
  netAmount: number;
  description?: string | null;
  reference?: string | null;
  status: TransactionStatus;
  type: TransactionType;
  externalRef?: string | null;
  processingTime?: string | undefined;
  completedAt?: string | undefined;
  failedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  fromAccount: {
    id: string;
    userId: string;
    currency: string;
  };
  toAccount: {
    id: string;
    userId: string;
    currency: string;
  };
}

export interface TransactionLimitInfo {
  limitType: LimitType;
  limitPeriod: LimitPeriod;
  totalLimit: number;
  usedAmount: number;
  remainingAmount: number;
  resetAt: Date;
}

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedFee: number;
  limitInfo: TransactionLimitInfo[];
}

export class TransactionService {
  /**
   * Validate transaction before processing
   */
  static async validateTransaction(
    request: TransactionRequest,
    requestingUserId: string
  ): Promise<TransactionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let estimatedFee = 0;

    try {
      // Validate accounts
      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findUnique({ where: { id: request.fromAccountId } }),
        prisma.account.findUnique({ where: { id: request.toAccountId } }),
      ]);

      if (!fromAccount || !toAccount) {
        errors.push('One or both accounts not found');
        return {
          isValid: false,
          errors,
          warnings,
          estimatedFee: 0,
          limitInfo: [],
        };
      }

      // Check account status
      if (!fromAccount.isActive) {
        errors.push('Source account is inactive');
      }

      if (!toAccount.isActive) {
        errors.push('Destination account is inactive');
      }

      // Check permissions
      if (fromAccount.userId !== requestingUserId) {
        errors.push('You can only transfer from your own account');
      }

      // Check balance
      if (Number(fromAccount.balance) < request.amount) {
        errors.push('Insufficient funds');
      }

      // Calculate fee
      estimatedFee = await this.calculateTransactionFee(request);

      if (Number(fromAccount.balance) < request.amount + estimatedFee) {
        errors.push(`Insufficient funds including fee (${estimatedFee})`);
      }

      // Check limits
      const limitInfo = await this.checkTransactionLimits(
        request.fromAccountId,
        request.amount,
        request.type
      );
      const limitViolations = limitInfo.filter(limit => limit.remainingAmount < request.amount);

      if (limitViolations.length > 0) {
        limitViolations.forEach(limit => {
          errors.push(
            `${limit.limitType} ${limit.limitPeriod.toLowerCase()} limit exceeded. Remaining: $${limit.remainingAmount}`
          );
        });
      }

      // Warnings for high amounts
      if (request.amount > 10000) {
        warnings.push('High value transaction - additional verification may be required');
      }

      // Same account warning
      if (request.fromAccountId === request.toAccountId) {
        errors.push('Cannot transfer to the same account');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedFee,
        limitInfo,
      };
    } catch (error) {
      logger.error('Transaction validation error:', error);
      return {
        isValid: false,
        errors: ['Internal validation error'],
        warnings,
        estimatedFee: 0,
        limitInfo: [],
      };
    }
  }

  /**
   * Process a transaction
   */
  static async processTransaction(
    request: TransactionRequest,
    requestingUserId: string
  ): Promise<TransactionResponse> {
    try {
      // Validate first
      const validation = await this.validateTransaction(request, requestingUserId);
      if (!validation.isValid) {
        await this.logTransactionAudit(
          {
            fromAccountId: request.fromAccountId,
            toAccountId: request.toAccountId,
            amount: request.amount,
          },
          requestingUserId,
          AuditAction.TRANSACTION_FAIL,
          null,
          null,
          { failedReason: validation.errors.join(', ') }
        );
        throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
      }

      // Get accounts
      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findUnique({ where: { id: request.fromAccountId } }),
        prisma.account.findUnique({ where: { id: request.toAccountId } }),
      ]);

      if (!fromAccount || !toAccount) {
        throw new Error('Accounts not found');
      }

      const fee = validation.estimatedFee;
      const totalDeduction = request.amount + fee;

      // Process transaction in database transaction
      const result = await prisma.$transaction(async tx => {
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            fromAccountId: request.fromAccountId,
            toAccountId: request.toAccountId,
            amount: request.amount,
            fee,
            description:
              request.description || `Transfer from ${fromAccount.id} to ${toAccount.id}`,
            reference: request.reference || null,
            type: request.type || TransactionType.TRANSFER,
            status: TransactionStatus.PROCESSING,
            processingTime: new Date(),
            metadata: {
              requestingUserId,
              originalBalance: {
                from: Number(fromAccount.balance),
                to: Number(toAccount.balance),
              },
            },
          },
          include: {
            fromAccount: {
              select: { id: true, userId: true, currency: true },
            },
            toAccount: {
              select: { id: true, userId: true, currency: true },
            },
          },
        });

        // Add fee record if applicable
        if (fee > 0) {
          await tx.transactionFee.create({
            data: {
              transactionId: transaction.id,
              feeType: FeeType.TRANSACTION_FEE,
              amount: fee,
              description: 'Standard transaction fee',
            },
          });
        }

        // Update account balances
        await Promise.all([
          tx.account.update({
            where: { id: request.fromAccountId },
            data: { balance: Number(fromAccount.balance) - totalDeduction },
          }),
          tx.account.update({
            where: { id: request.toAccountId },
            data: { balance: Number(toAccount.balance) + request.amount },
          }),
        ]);

        // Update transaction limits
        await this.updateTransactionLimits(tx, request.fromAccountId, request.amount, request.type);

        // Complete transaction
        const completedTransaction = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
          },
          include: {
            fromAccount: {
              select: { id: true, userId: true, currency: true },
            },
            toAccount: {
              select: { id: true, userId: true, currency: true },
            },
          },
        });

        return completedTransaction;
      });

      // Send notifications
      await this.sendTransactionNotifications(result);

      // Log audit event
      await this.logTransactionAudit(
        result,
        requestingUserId,
        AuditAction.TRANSACTION_COMPLETE,
        null,
        null,
        {
          description: result.description,
          reference: result.reference,
        }
      );

      logger.info(
        `Transaction ${result.id} completed: $${request.amount} from ${request.fromAccountId} to ${request.toAccountId}`
      );

      return {
        id: result.id,
        fromAccountId: result.fromAccountId,
        toAccountId: result.toAccountId,
        amount: Number(result.amount),
        fee: Number(result.fee),
        netAmount: Number(result.amount) + Number(result.fee),
        description: result.description,
        reference: result.reference,
        status: result.status,
        type: result.type,
        externalRef: result.externalRef,
        processingTime: result.processingTime?.toISOString(),
        completedAt: result.completedAt?.toISOString(),
        failedReason: result.failedReason,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        fromAccount: result.fromAccount,
        toAccount: result.toAccount,
      };
    } catch (error) {
      logger.error('Transaction processing error:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(
    transactionId: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<TransactionResponse> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          fromAccount: {
            select: { id: true, userId: true, currency: true },
          },
          toAccount: {
            select: { id: true, userId: true, currency: true },
          },
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check permissions - users can only view their own transactions
      if (
        requestingUserRole !== 'ADMIN' &&
        transaction.fromAccount.userId !== requestingUserId &&
        transaction.toAccount.userId !== requestingUserId
      ) {
        throw new Error('You can only view your own transactions');
      }

      await this.logTransactionAudit(
        { id: transaction.id, amount: transaction.amount, status: transaction.status },
        requestingUserId,
        AuditAction.TRANSACTION_READ,
        null,
        null,
        { id: transaction.id, amount: transaction.amount, status: transaction.status }
      );

      return {
        id: transaction.id,
        fromAccountId: transaction.fromAccountId,
        toAccountId: transaction.toAccountId,
        amount: Number(transaction.amount),
        fee: Number(transaction.fee),
        netAmount: Number(transaction.amount) + Number(transaction.fee),
        description: transaction.description,
        reference: transaction.reference,
        status: transaction.status,
        type: transaction.type,
        externalRef: transaction.externalRef,
        processingTime: transaction.processingTime?.toISOString(),
        completedAt: transaction.completedAt?.toISOString(),
        failedReason: transaction.failedReason,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        fromAccount: transaction.fromAccount,
        toAccount: transaction.toAccount,
      };
    } catch (error) {
      logger.error('Get transaction error:', error);
      throw error;
    }
  }

  /**
   * Get user's transactions
   */
  static async getUserTransactions(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      status?: TransactionStatus;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      minAmount?: number;
      maxAmount?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<TransactionResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Get user's account
      const userAccount = await prisma.account.findUnique({
        where: { userId },
      });

      if (!userAccount) {
        throw new Error('User account not found');
      }

      // Build where clause
      const where: any = {
        OR: [{ fromAccountId: userAccount.id }, { toAccountId: userAccount.id }],
      };

      if (status) where.status = status;
      if (type) where.type = type;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {};
        if (minAmount !== undefined) where.amount.gte = minAmount;
        if (maxAmount !== undefined) where.amount.lte = maxAmount;
      }

      if (search) {
        where.AND = [
          {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { reference: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            fromAccount: {
              select: { id: true, userId: true, currency: true },
            },
            toAccount: {
              select: { id: true, userId: true, currency: true },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      const transactionResponses: TransactionResponse[] = transactions.map(tx => ({
        id: tx.id,
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
        amount: Number(tx.amount),
        fee: Number(tx.fee),
        netAmount: Number(tx.amount) + Number(tx.fee),
        description: tx.description,
        reference: tx.reference,
        status: tx.status,
        type: tx.type,
        externalRef: tx.externalRef,
        processingTime: tx.processingTime?.toISOString(),
        completedAt: tx.completedAt?.toISOString(),
        failedReason: tx.failedReason,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        fromAccount: tx.fromAccount,
        toAccount: tx.toAccount,
      }));

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      await this.logTransactionAudit(
        transactionResponses.map(tx => ({ id: tx.id, amount: tx.amount, status: tx.status })),
        userId,
        AuditAction.TRANSACTION_READ,
        null,
        null,
        { page, limit, total, type, status, startDate, endDate, minAmount, maxAmount, search }
      );

      return {
        success: true,
        data: transactionResponses,
        meta,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get user transactions error:', error);
      throw error;
    }
  }

  /**
   * Reverse a transaction
   */
  static async reverseTransaction(
    transactionId: string,
    reason: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<TransactionResponse> {
    try {
      // Only admins can reverse transactions
      if (requestingUserRole !== 'ADMIN') {
        throw new Error('Only administrators can reverse transactions');
      }

      const originalTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          fromAccount: true,
          toAccount: true,
        },
      });

      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new Error('Can only reverse completed transactions');
      }

      // Check if already reversed
      const existingReversal = await prisma.transaction.findFirst({
        where: { reversalOf: transactionId },
      });

      if (existingReversal) {
        throw new Error('Transaction has already been reversed');
      }

      // Process reversal in database transaction
      const result = await prisma.$transaction(async tx => {
        // Create reversal transaction
        const reversalTransaction = await tx.transaction.create({
          data: {
            fromAccountId: originalTransaction.toAccountId,
            toAccountId: originalTransaction.fromAccountId,
            amount: originalTransaction.amount,
            fee: 0, // No fee for reversals
            description: `Reversal of transaction ${transactionId}: ${reason}`,
            type: TransactionType.REVERSAL,
            status: TransactionStatus.COMPLETED,
            reversalOf: transactionId,
            processingTime: new Date(),
            completedAt: new Date(),
            metadata: {
              reversalReason: reason,
              reversedBy: requestingUserId,
              originalTransactionId: transactionId,
            },
          },
          include: {
            fromAccount: {
              select: { id: true, userId: true, currency: true },
            },
            toAccount: {
              select: { id: true, userId: true, currency: true },
            },
          },
        });

        // Update original transaction status
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: TransactionStatus.REVERSED },
        });

        // Reverse account balances
        await Promise.all([
          tx.account.update({
            where: { id: originalTransaction.fromAccountId },
            data: {
              balance: {
                increment: Number(originalTransaction.amount) + Number(originalTransaction.fee),
              },
            },
          }),
          tx.account.update({
            where: { id: originalTransaction.toAccountId },
            data: {
              balance: {
                decrement: Number(originalTransaction.amount),
              },
            },
          }),
        ]);

        return reversalTransaction;
      });

      // Send notifications
      await this.sendTransactionNotifications(result);

      // Log audit event
      await this.logTransactionAudit(
        result,
        requestingUserId,
        AuditAction.TRANSACTION_COMPLETE,
        null,
        null,
        result.metadata
      );

      logger.info(`Transaction ${transactionId} reversed by admin ${requestingUserId}: ${reason}`);

      return {
        id: result.id,
        fromAccountId: result.fromAccountId,
        toAccountId: result.toAccountId,
        amount: Number(result.amount),
        fee: Number(result.fee),
        netAmount: Number(result.amount) + Number(result.fee),
        description: result.description,
        reference: result.reference,
        status: result.status,
        type: result.type,
        externalRef: result.externalRef,
        processingTime: result.processingTime?.toISOString(),
        completedAt: result.completedAt?.toISOString(),
        failedReason: result.failedReason,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        fromAccount: result.fromAccount,
        toAccount: result.toAccount,
      };
    } catch (error) {
      logger.error('Transaction reversal error:', error);
      throw error;
    }
  }

  /**
   * Calculate transaction fee
   */
  private static async calculateTransactionFee(request: TransactionRequest): Promise<number> {
    // Simple fee calculation - can be made more complex based on business rules
    const amount = request.amount;
    let fee = 0;

    // Base transaction fee
    fee += 2.5;

    // Percentage-based fee for large transactions
    if (amount > 1000) {
      fee += amount * 0.001; // 0.1%
    }

    // Different fees for different transaction types
    switch (request.type) {
      case TransactionType.WITHDRAWAL:
        fee += 1.0;
        break;
      case TransactionType.TRANSFER:
        // Standard fee already applied
        break;
      default:
        break;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check transaction limits
   */
  private static async checkTransactionLimits(
    accountId: string,
    amount: number,
    transactionType?: TransactionType
  ): Promise<TransactionLimitInfo[]> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return [];
    }

    const now = new Date();
    const limitInfo: TransactionLimitInfo[] = [];

    // Define limit mappings based on transaction type
    let limitMappings = [];
    if (!transactionType || transactionType === LimitType.TRANSFER) {
      limitMappings.push({
        type: LimitType.TRANSFER,
        periods: [
          { period: LimitPeriod.DAILY, limit: Number(account.dailyTransferLimit) },
          { period: LimitPeriod.WEEKLY, limit: Number(account.weeklyTransferLimit) },
          { period: LimitPeriod.MONTHLY, limit: Number(account.monthlyTransferLimit) },
        ],
      });
    }
    if (!transactionType || transactionType === LimitType.WITHDRAWAL) {
      limitMappings.push({
        type: LimitType.WITHDRAWAL,
        periods: [
          { period: LimitPeriod.DAILY, limit: Number(account.dailyWithdrawalLimit) },
          { period: LimitPeriod.WEEKLY, limit: Number(account.weeklyWithdrawalLimit) },
          { period: LimitPeriod.MONTHLY, limit: Number(account.monthlyWithdrawalLimit) },
        ],
      });
    }

    for (const limitMapping of limitMappings) {
      for (const periodLimit of limitMapping.periods) {
        // Calculate period start
        let periodStart: Date;
        let resetAt: Date;

        switch (periodLimit.period) {
          case LimitPeriod.DAILY:
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            resetAt = new Date(periodStart);
            resetAt.setDate(resetAt.getDate() + 1);
            break;
          case LimitPeriod.WEEKLY:
            // Make week start on Monday (0=Sunday, 1=Monday, ..., 6=Saturday)
            const jsDayOfWeek = now.getDay();
            // Calculate days since last Monday (if today is Monday, it's 0)
            const daysSinceMonday = (jsDayOfWeek + 6) % 7;
            periodStart = new Date(now);
            periodStart.setDate(now.getDate() - daysSinceMonday);
            periodStart.setHours(0, 0, 0, 0);
            resetAt = new Date(periodStart);
            resetAt.setDate(resetAt.getDate() + 7);
            break;
          case LimitPeriod.MONTHLY:
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            resetAt = new Date(periodStart);
            resetAt.setMonth(resetAt.getMonth() + 1);
            break;
          default:
            continue;
        }

        // Get used amount for this period
        const usedAmount = await prisma.transaction.aggregate({
          where: {
            fromAccountId: accountId,
            status: { in: [TransactionStatus.COMPLETED, TransactionStatus.PROCESSING] },
            createdAt: { gte: periodStart, lt: now },
            // Filter by transaction type if relevant
            ...(limitMapping.type === LimitType.TRANSFER &&
            transactionType === TransactionType.TRANSFER
              ? { type: TransactionType.TRANSFER }
              : {}),
            ...(limitMapping.type === LimitType.WITHDRAWAL &&
            transactionType === TransactionType.WITHDRAWAL
              ? { type: TransactionType.WITHDRAWAL }
              : {}),
          },
          _sum: { amount: true },
        });

        const used = Number(usedAmount._sum.amount) || 0;
        const remaining = periodLimit.limit - used;

        limitInfo.push({
          limitType: limitMapping.type,
          limitPeriod: periodLimit.period,
          totalLimit: periodLimit.limit,
          usedAmount: used,
          remainingAmount: Math.max(0, remaining),
          resetAt,
        });
      }
    }

    return limitInfo;
  }

  /**
   * Update transaction limits (placeholder for more complex limit tracking)
   */
  private static async updateTransactionLimits(
    tx: any,
    accountId: string,
    amount: number,
    transactionType?: TransactionType
  ): Promise<void> {
    // In a real implementation, this would update TransactionLimit records
    // For now, we'll just log the usage
    logger.info(
      `Transaction limit usage recorded: Account ${accountId}, Amount: ${amount}, Type: ${transactionType}`
    );
  }

  /**
   * Send transaction notifications
   */
  private static async sendTransactionNotifications(transaction: any): Promise<void> {
    try {
      const notifications = [];

      // Notify sender
      notifications.push({
        userId: transaction.fromAccount.userId,
        accountId: transaction.fromAccountId,
        transactionId: transaction.id,
        type: NotificationType.TRANSACTION_COMPLETED,
        title: 'Transaction Sent',
        message: `You sent $${Number(transaction.amount)} to account ${transaction.toAccountId}`,
        metadata: {
          transactionId: transaction.id,
          amount: Number(transaction.amount),
          fee: Number(transaction.fee),
        },
      });

      // Notify receiver
      notifications.push({
        userId: transaction.toAccount.userId,
        accountId: transaction.toAccountId,
        transactionId: transaction.id,
        type: NotificationType.TRANSACTION_COMPLETED,
        title: 'Transaction Received',
        message: `You received $${Number(transaction.amount)} from account ${transaction.fromAccountId}`,
        metadata: {
          transactionId: transaction.id,
          amount: Number(transaction.amount),
        },
      });

      await prisma.notification.createMany({
        data: notifications,
      });

      logger.info(`Notifications sent for transaction ${transaction.id}`);
    } catch (error) {
      logger.error('Failed to send transaction notifications:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Log transaction audit event (refactored for flexibility)
   */
  private static async logTransactionAudit(
    transaction: any,
    userId: string,
    action: AuditAction,
    oldValues?: any,
    newValues?: any,
    metadata?: any
  ): Promise<void> {
    try {
      // If transaction.id exists, use it as resourceId; otherwise, null (for failed attempts)
      const resourceId = transaction && transaction.id ? transaction.id : null;
      // If newValues is provided, use it as-is; otherwise, use transaction fields if present
      let finalNewValues = newValues;
      if (!finalNewValues) {
        if (transaction && transaction.id) {
          finalNewValues = {
            id: transaction.id,
            fromAccountId: transaction.fromAccountId,
            toAccountId: transaction.toAccountId,
            amount: Number(transaction.amount),
            fee: Number(transaction.fee),
            status: transaction.status,
            type: transaction.type,
          };
        } else {
          finalNewValues = transaction;
        }
      }
      // For failed attempts, metadata may only have failedReason
      await this.logAuditEvent(
        userId,
        action,
        'Transaction',
        resourceId,
        oldValues || null,
        finalNewValues || null,
        metadata || null
      );
    } catch (error) {
      logger.error('Failed to log transaction audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Shared audit event logger for transactions
   */
  private static async logAuditEvent(
    userId: string | null,
    action: AuditAction,
    resource: string,
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          oldValues: oldValues || null,
          newValues: newValues || null,
          metadata: metadata || null,
          ipAddress: '127.0.0.1', // TODO: Get from request context
          userAgent: 'TransactionService', // TODO: Get from request context
        },
      });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
}
