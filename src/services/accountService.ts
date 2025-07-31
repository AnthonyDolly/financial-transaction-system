import { AuditAction, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  AccountResponse,
  AccountBalanceResponse,
  TransferRequest,
  DepositRequest,
  WithdrawRequest,
  AccountStatementQuery,
  TransactionResponse,
  AccountStats,
  FreezeAccountRequest,
  UnfreezeAccountRequest,
} from '../types/account';
import { PaginatedResponse, PaginationMeta } from '../types/api';

export class AccountService {
  /**
   * Get current user's account
   */
  static async getMyAccount(requestingUserId: string): Promise<AccountResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { userId: requestingUserId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      if (!account) {
        throw new Error('Account not found for current user');
      }

      await this.logAccountActivity(
        account.id,
        AuditAction.ACCOUNT_VIEWED,
        'Own account information accessed',
        requestingUserId
      );

      return {
        id: account.id,
        userId: account.userId,
        balance: Number(account.balance),
        currency: account.currency,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        user: account.user
          ? {
              id: account.user.id,
              email: account.user.email,
              firstName: account.user.firstName,
              lastName: account.user.lastName,
              role: account.user.role,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Get my account error:', error);
      throw error;
    }
  }

  /**
   * Get current user's account balance
   */
  static async getMyAccountBalance(requestingUserId: string): Promise<AccountBalanceResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { userId: requestingUserId },
      });

      if (!account) {
        throw new Error('Account not found for current user');
      }

      // Get count and sum of outgoing pending transactions
      const [pendingTransactions, outgoingPendingSum] = await Promise.all([
        prisma.transaction.count({
          where: {
            OR: [{ fromAccountId: account.id }, { toAccountId: account.id }],
            status: TransactionStatus.PENDING,
          },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            fromAccountId: account.id,
            status: TransactionStatus.PENDING,
          },
        }),
      ]);

      const pendingOutgoingAmount = outgoingPendingSum._sum.amount || 0;
      const availableBalance = Number(account.balance) - Number(pendingOutgoingAmount);

      await this.logAccountActivity(
        account.id,
        AuditAction.BALANCE_CHECKED,
        'Own account balance checked',
        requestingUserId
      );

      return {
        accountId: account.id,
        balance: Number(account.balance),
        currency: account.currency,
        availableBalance,
        pendingTransactions,
        lastUpdated: account.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Get my account balance error:', error);
      throw error;
    }
  }

  /**
   * Deposit money to current user's account
   */
  static async depositToMyAccount(
    data: DepositRequest,
    requestingUserId: string
  ): Promise<{ transactionId: string; newBalance: number }> {
    try {
      // Get current user's account
      const account = await prisma.account.findUnique({
        where: { userId: requestingUserId },
      });

      if (!account) {
        throw new Error('Account not found for current user');
      }

      return this.deposit(account.id, data, requestingUserId, 'USER');
    } catch (error) {
      logger.error('Deposit to my account error:', error);
      throw error;
    }
  }

  /**
   * Withdraw money from current user's account
   */
  static async withdrawFromMyAccount(
    data: WithdrawRequest,
    requestingUserId: string
  ): Promise<{ transactionId: string; newBalance: number }> {
    try {
      // Get current user's account
      const account = await prisma.account.findUnique({
        where: { userId: requestingUserId },
      });

      if (!account) {
        throw new Error('Account not found for current user');
      }

      return this.withdraw(account.id, data, requestingUserId, 'USER');
    } catch (error) {
      logger.error('Withdraw from my account error:', error);
      throw error;
    }
  }

  /**
   * Get current user's account statement
   */
  static async getMyAccountStatement(
    query: AccountStatementQuery,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<PaginatedResponse<TransactionResponse>> {
    try {
      // Get current user's account
      const account = await prisma.account.findUnique({
        where: { userId: requestingUserId },
      });

      if (!account) {
        throw new Error('Account not found for current user');
      }

      return this.getAccountStatement(account.id, query, requestingUserId, requestingUserRole);
    } catch (error) {
      logger.error('Get my account statement error:', error);
      throw error;
    }
  }

  /**
   * Get account by ID (Admins can access any)
   */
  static async getAccountById(
    accountId: string,
    requestingUserId: string,
  ): Promise<AccountResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // No user-level permission check needed; only admins can access this endpoint.
      await this.logAccountActivity(
        accountId,
        AuditAction.ACCOUNT_VIEWED,
        'Account information accessed by admin',
        requestingUserId
      );

      return {
        id: account.id,
        userId: account.userId,
        balance: Number(account.balance),
        currency: account.currency,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        user: account.user
          ? {
              id: account.user.id,
              email: account.user.email,
              firstName: account.user.firstName,
              lastName: account.user.lastName,
              role: account.user.role,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Get account by ID error:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(
    accountId: string,
    requestingUserId: string
  ): Promise<AccountBalanceResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // No user-level permission check needed; only admins can access this endpoint.
      await this.logAccountActivity(
        accountId,
        AuditAction.BALANCE_CHECKED,
        'Account balance checked by admin',
        requestingUserId
      );

      // Get count of pending transactions (incoming and outgoing) and sum of outgoing pending transactions
      const [pendingTransactions, outgoingPendingSum] = await Promise.all([
        prisma.transaction.count({
          where: {
            OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
            status: TransactionStatus.PENDING,
          },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            fromAccountId: accountId,
            status: TransactionStatus.PENDING,
          },
        }),
      ]);

      const pendingOutgoingAmount = outgoingPendingSum._sum.amount || 0;
      const availableBalance = Number(account.balance) - Number(pendingOutgoingAmount);

      return {
        accountId: account.id,
        balance: Number(account.balance),
        currency: account.currency,
        availableBalance,
        pendingTransactions,
        lastUpdated: account.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Get account balance error:', error);
      throw error;
    }
  }

  /**
   * Transfer money between accounts
   */
  static async transfer(
    data: TransferRequest,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{ transactionId: string; message: string }> {
    try {
      const { fromAccountId, toAccountId, amount, description, reference } = data;
      let newFromAccountBalance: Prisma.Decimal | null = null;
      let newToAccountBalance: Prisma.Decimal | null = null;

      // Validate accounts exist
      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findUnique({ where: { id: fromAccountId } }),
        prisma.account.findUnique({ where: { id: toAccountId } }),
      ]);

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }

      // Check permissions - user can only transfer from their own account
      if (requestingUserRole !== 'ADMIN' && fromAccount.userId !== requestingUserId) {
        logger.info(
          `User ${requestingUserId} tried to transfer from account ${fromAccountId} but is not the owner`
        );
        await this.logAccountActivity(
          fromAccountId,
          AuditAction.TRANSACTION_FAIL,
          'Transfer attempt failed - not owner',
          requestingUserId
        );
        throw new Error('You can only transfer from your own account');
      }

      // Check account status
      if (!fromAccount.isActive || !toAccount.isActive) {
        logger.info(
          `User ${requestingUserId} tried to transfer from account ${fromAccountId} but is not the owner`
        );
        await this.logAccountActivity(
          fromAccountId,
          AuditAction.TRANSACTION_FAIL,
          'Transfer attempt failed - inactive account',
          requestingUserId
        );
        throw new Error('Cannot transfer involving inactive accounts');
      }

      // Check sufficient balance
      if (Number(fromAccount.balance) < amount) {
        logger.info(
          `User ${requestingUserId} tried to transfer from account ${fromAccountId} but is not the owner`
        );
        await this.logAccountActivity(
          fromAccountId,
          AuditAction.TRANSACTION_FAIL,
          'Transfer attempt failed - insufficient funds',
          requestingUserId
        );
        throw new Error('Insufficient funds');
      }

      // Perform transfer in transaction
      const result = await prisma.$transaction(async tx => {
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            fromAccountId,
            toAccountId,
            amount,
            fee: 0,
            description: description || `Transfer from ${fromAccountId} to ${toAccountId}`,
            status: TransactionStatus.COMPLETED,
            type: TransactionType.TRANSFER,
            reference: reference || null,
            processingTime: new Date(),
            completedAt: new Date(),
            metadata: {
              fromAccount: fromAccountId,
              toAccount: toAccountId,
              amount,
              currency: fromAccount.currency,
              description,
              reference,
            },
          },
        });

        // Update account balances
        const [fromUpdateResult, toUpdateResult] = await Promise.all([
          tx.account.update({
            where: { id: fromAccountId },
            data: { balance: Number(fromAccount.balance) - amount },
          }),
          tx.account.update({
            where: { id: toAccountId },
            data: { balance: Number(toAccount.balance) + amount },
          }),
        ]);

        newFromAccountBalance = fromUpdateResult.balance;
        newToAccountBalance = toUpdateResult.balance;

        return { transactionId: transaction.id };
      });

      // Log activity
      await Promise.all([
        this.logAccountActivity(
          fromAccountId,
          AuditAction.TRANSFER_OUT,
          `Transferred $${amount} to account ${toAccountId}`,
          requestingUserId,
          Number(fromAccount.balance),
          Number(newFromAccountBalance),
          { amount, toAccount: toAccountId, transactionId: result.transactionId }
        ),
        this.logAccountActivity(
          toAccountId,
          AuditAction.TRANSFER_IN,
          `Received $${amount} from account ${fromAccountId}`,
          requestingUserId,
          Number(toAccount.balance),
          Number(newToAccountBalance),
          { amount, fromAccount: fromAccountId, transactionId: result.transactionId }
        ),
      ]);

      logger.info(
        `Transfer completed: $${amount} from ${fromAccountId} to ${toAccountId} by user ${requestingUserId}`
      );

      return {
        transactionId: result.transactionId,
        message: `Successfully transferred $${amount} to account ${toAccountId}`,
      };
    } catch (error) {
      logger.error('Transfer error:', error);
      throw error;
    }
  }

  /**
   * Deposit money to account (simulated - creates a transaction from system account)
   */
  static async deposit(
    accountId: string,
    data: DepositRequest,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{ transactionId: string; newBalance: number }> {
    try {
      const { amount, description, reference, source } = data;

      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check permissions
      if (requestingUserRole !== 'ADMIN' && account.userId !== requestingUserId) {
        await this.logAccountActivity(
          accountId,
          AuditAction.TRANSACTION_FAIL,
          'Unauthorized deposit attempt',
          requestingUserId,
          null,
          null,
          { transactionType: 'DEPOSIT', reason: 'not_owner', amount, source }
        );
        throw new Error('You can only deposit to your own account');
      }

      if (!account.isActive) {
        await this.logAccountActivity(
          accountId,
          AuditAction.TRANSACTION_FAIL,
          'Attempted deposit to inactive account',
          requestingUserId,
          null,
          null,
          { transactionType: 'DEPOSIT', reason: 'inactive', amount, source }
        );
        throw new Error('Cannot deposit to inactive account');
      }

      const newBalance = Number(account.balance) + amount;

      // Create a system account for deposits if it doesn't exist
      let systemAccount = await prisma.account.findFirst({
        where: { user: { email: 'system@financial.com' } },
      });

      if (!systemAccount) {
        // Create system user and account
        const systemUser = await prisma.user.create({
          data: {
            email: 'system@financial.com',
            password: 'system',
            firstName: 'System',
            lastName: 'Account',
            role: 'ADMIN',
          },
        });

        systemAccount = await prisma.account.create({
          data: {
            userId: systemUser.id,
            balance: 999999999, // Large balance for system account
            currency: 'USD',
          },
        });
      }

      // Perform deposit as a transfer from system account
      const result = await prisma.$transaction(async tx => {
        const transaction = await tx.transaction.create({
          data: {
            fromAccountId: systemAccount!.id,
            toAccountId: accountId,
            amount,
            fee: 0,
            description: description || `${source} deposit`,
            status: TransactionStatus.COMPLETED,
            type: TransactionType.DEPOSIT,
            reference: reference || null,
            externalRef: null,
            // For instant transactions, processingTime and completedAt are the same.
            // If asynchronous processing is introduced, set these at the appropriate times.
            processingTime: new Date(),
            completedAt: new Date(),
            failedReason: null,
            reversalOf: null,
            metadata: { source },
          },
        });

        await tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });

        return { transactionId: transaction.id };
      });

      await this.logAccountActivity(
        accountId,
        AuditAction.DEPOSIT,
        `Deposited $${amount} via ${source}`,
        requestingUserId,
        Number(account.balance),
        Number(newBalance),
        { amount, source, transactionId: result.transactionId }
      );

      logger.info(
        `Deposit completed: $${amount} to ${accountId} via ${source} by user ${requestingUserId}`
      );

      return {
        transactionId: result.transactionId,
        newBalance,
      };
    } catch (error) {
      logger.error('Deposit error:', error);
      throw error;
    }
  }

  /**
   * Withdraw money from account (simulated - creates a transaction to system account)
   */
  static async withdraw(
    accountId: string,
    data: WithdrawRequest,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{ transactionId: string; newBalance: number }> {
    try {
      const { amount, description, reference, method } = data;

      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check permissions
      if (requestingUserRole !== 'ADMIN' && account.userId !== requestingUserId) {
        await this.logAccountActivity(
          accountId,
          AuditAction.TRANSACTION_FAIL,
          'Unauthorized withdrawal attempt',
          requestingUserId,
          null,
          null,
          { transactionType: 'WITHDRAWAL', reason: 'not_owner', amount, method }
        );
        throw new Error('You can only withdraw from your own account');
      }

      if (!account.isActive) {
        await this.logAccountActivity(
          accountId,
          AuditAction.TRANSACTION_FAIL,
          'Attempted withdrawal from inactive account',
          requestingUserId,
          null,
          null,
          { transactionType: 'WITHDRAWAL', reason: 'inactive', amount, method }
        );
        throw new Error('Cannot withdraw from inactive account');
      }

      if (Number(account.balance) < amount) {
        await this.logAccountActivity(
          accountId,
          AuditAction.TRANSACTION_FAIL,
          'Insufficient funds for withdrawal',
          requestingUserId,
          null,
          null,
          { transactionType: 'WITHDRAWAL', reason: 'insufficient_funds', amount, method }
        );
        throw new Error('Insufficient funds');
      }

      const newBalance = Number(account.balance) - amount;

      // Get system account for withdrawals
      let systemAccount = await prisma.account.findFirst({
        where: { user: { email: 'system@financial.com' } },
      });

      if (!systemAccount) {
        // Create system user and account
        const systemUser = await prisma.user.create({
          data: {
            email: 'system@financial.com',
            password: 'system',
            firstName: 'System',
            lastName: 'Account',
            role: 'ADMIN',
          },
        });

        systemAccount = await prisma.account.create({
          data: {
            userId: systemUser.id,
            balance: 999999999,
            currency: 'USD',
          },
        });
      }

      // Perform withdrawal as a transfer to system account
      const result = await prisma.$transaction(async tx => {
        const transaction = await tx.transaction.create({
          data: {
            fromAccountId: accountId,
            toAccountId: systemAccount!.id,
            amount,
            fee: 0,
            description: description || `${method} withdrawal`,
            status: TransactionStatus.COMPLETED,
            type: TransactionType.WITHDRAWAL,
            reference: reference || null,
            externalRef: null,
            // For instant transactions, processingTime and completedAt are the same.
            processingTime: new Date(),
            completedAt: new Date(),
            failedReason: null,
            reversalOf: null,
            metadata: { method },
          },
        });

        await tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });

        return { transactionId: transaction.id };
      });

      await this.logAccountActivity(
        accountId,
        AuditAction.WITHDRAWAL,
        `Withdrew $${amount} via ${method}`,
        requestingUserId,
        Number(account.balance),
        Number(newBalance),
        { amount, method, transactionId: result.transactionId }
      );

      logger.info(
        `Withdrawal completed: $${amount} from ${accountId} via ${method} by user ${requestingUserId}`
      );

      return {
        transactionId: result.transactionId,
        newBalance,
      };
    } catch (error) {
      logger.error('Withdrawal error:', error);
      throw error;
    }
  }

  /**
   * Get account statement (transaction history)
   */
  static async getAccountStatement(
    accountId: string,
    query: AccountStatementQuery,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<PaginatedResponse<TransactionResponse>> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check permissions
      if (requestingUserRole !== 'ADMIN' && account.userId !== requestingUserId) {
        throw new Error('You can only access your own account statement');
      }

      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause - include transactions where this account is either sender or receiver

      const where: Prisma.TransactionWhereInput = {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      };

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
              select: { id: true, user: { select: { email: true } } },
            },
            toAccount: {
              select: { id: true, user: { select: { email: true } } },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      const transactionResponses: TransactionResponse[] = transactions.map(tx => {
        const isIncoming = tx.toAccountId === accountId;
        const isOutgoing = tx.fromAccountId === accountId;

        let type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' = 'TRANSFER_IN';
        let amount = Number(tx.amount);

        if (isOutgoing && isIncoming) {
          // Self transfer (shouldn't happen but handle it)
          type = 'TRANSFER_OUT';
        } else if (isOutgoing) {
          type = 'TRANSFER_OUT';
          amount = -amount; // Negative for outgoing
        } else if (isIncoming) {
          // Check if it's from system account (deposit/withdrawal simulation)
          if (tx.fromAccount.user?.email === 'system@financial.com') {
            type = 'DEPOSIT';
          } else {
            type = 'TRANSFER_IN';
          }
        }

        // If outgoing to system account, it's a withdrawal
        if (isOutgoing && tx.toAccount.user?.email === 'system@financial.com') {
          type = 'WITHDRAWAL';
        }

        return {
          id: tx.id,
          accountId: accountId,
          type,
          amount,
          balance: 0, // We don't store running balance in this model
          description: tx.description,
          reference: tx.reference,
          status: tx.status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
          createdAt: tx.createdAt.toISOString(),
          relatedAccountId: isOutgoing ? tx.toAccountId : tx.fromAccountId,
          metadata: {
            fromAccount: tx.fromAccountId,
            toAccount: tx.toAccountId,
            fromEmail: tx.fromAccount.user?.email,
            toEmail: tx.toAccount.user?.email,
          },
        };
      });

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      await this.logAccountActivity(
        accountId,
        AuditAction.STATEMENT_VIEWED,
        `Account statement accessed (${transactions.length} transactions)`,
        requestingUserId,
        null,
        null,
        { query }
      );

      return {
        success: true,
        data: transactionResponses,
        meta,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get account statement error:', error);
      throw error;
    }
  }

  /**
   * Freeze account (Admin only)
   */
  static async freezeAccount(
    accountId: string,
    data: FreezeAccountRequest,
    requestingUserId: string
  ): Promise<AccountResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { user: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      if (!account.isActive) {
        logger.info(`Account ${accountId} is already inactive`);
        await this.logAccountActivity(
          accountId,
          AuditAction.ACCOUNT_FROZEN,
          `Account ${accountId} is already inactive`,
          requestingUserId,
          null,
          null,
          null
        );
        throw new Error('Account is already inactive');
      }

      const updatedAccount = await prisma.account.update({
        where: { id: accountId },
        data: { isActive: false },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      await this.logAccountActivity(
        accountId,
        AuditAction.ACCOUNT_FROZEN,
        `Account frozen by admin ${requestingUserId}: ${data.reason}`,
        requestingUserId,
        null,
        null,
        { reason: data.reason, duration: data.duration, notifyUser: data.notifyUser }
      );

      logger.info(`Account ${accountId} frozen by admin ${requestingUserId}: ${data.reason}`);

      return {
        id: updatedAccount.id,
        userId: updatedAccount.userId,
        balance: Number(updatedAccount.balance),
        currency: updatedAccount.currency,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
        user: updatedAccount.user
          ? {
              id: updatedAccount.user.id,
              email: updatedAccount.user.email,
              firstName: updatedAccount.user.firstName,
              lastName: updatedAccount.user.lastName,
              role: updatedAccount.user.role,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Freeze account error:', error);
      throw error;
    }
  }

  /**
   * Unfreeze account (Admin only)
   */
  static async unfreezeAccount(
    accountId: string,
    data: UnfreezeAccountRequest,
    requestingUserId: string
  ): Promise<AccountResponse> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { user: true },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      if (account.isActive) {
        logger.info(`Account ${accountId} is already active`);
        await this.logAccountActivity(
          accountId,
          AuditAction.ACCOUNT_UNFROZEN,
          `Account ${accountId} is already active`,
          requestingUserId,
          null,
          null,
          null
        );
        throw new Error('Account is already active');
      }

      const updatedAccount = await prisma.account.update({
        where: { id: accountId },
        data: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      await this.logAccountActivity(
        accountId,
        AuditAction.ACCOUNT_UNFROZEN,
        `Account unfrozen by admin ${requestingUserId}: ${data.reason}`,
        requestingUserId,
        null,
        null,
        { reason: data.reason, notifyUser: data.notifyUser }
      );

      logger.info(`Account ${accountId} unfrozen by admin ${requestingUserId}: ${data.reason}`);

      return {
        id: updatedAccount.id,
        userId: updatedAccount.userId,
        balance: Number(updatedAccount.balance),
        currency: updatedAccount.currency,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
        user: updatedAccount.user
          ? {
              id: updatedAccount.user.id,
              email: updatedAccount.user.email,
              firstName: updatedAccount.user.firstName,
              lastName: updatedAccount.user.lastName,
              role: updatedAccount.user.role,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Unfreeze account error:', error);
      throw error;
    }
  }

  /**
   * Get account statistics (Admin only)
   */
  static async getAccountStats(requestingUserId: string): Promise<AccountStats> {
    try {
      const [accountStats, transactionStats] = await Promise.all([
        prisma.account.aggregate({
          _count: { id: true },
          _sum: { balance: true },
          _avg: { balance: true },
        }),
        prisma.transaction.aggregate({
          _count: { id: true },
          _sum: { amount: true },
        }),
      ]);

      const [activeAccounts, inactiveAccounts] = await Promise.all([
        prisma.account.count({ where: { isActive: true } }),
        prisma.account.count({ where: { isActive: false } }),
      ]);

      await this.logAuditEvent(requestingUserId, AuditAction.READ, 'AccountStats', 'system');

      return {
        totalBalance: Number(accountStats._sum.balance) || 0,
        totalAccounts: accountStats._count.id || 0,
        activeAccounts,
        inactiveAccounts,
        totalTransactions: transactionStats._count.id || 0,
        totalDeposits: 0, // We'll calculate this differently
        totalWithdrawals: 0, // We'll calculate this differently
        averageBalance: Number(accountStats._avg.balance) || 0,
        currency: 'USD',
      };
    } catch (error) {
      logger.error('Get account stats error:', error);
      throw error;
    }
  }

  /**
   * Log account activity
   */
  private static async logAccountActivity(
    accountId: string,
    action: AuditAction,
    description: string,
    userId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any
  ): Promise<void> {
    try {
      await this.logAuditEvent(userId, action, 'Account', accountId, oldValues, newValues, {
        description,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to log account activity:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Log audit event
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
          userAgent: 'AccountService', // TODO: Get from request context
        },
      });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
}
