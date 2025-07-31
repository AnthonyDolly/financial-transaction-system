import { Decimal } from '@prisma/client/runtime/library';

export interface CreateAccountRequest {
  initialBalance?: number;
  currency?: string;
}

export interface AccountResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  toAccountId: string;
  amount: number;
  description?: string;
}

export interface TransactionResponse {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  reference?: string;
  createdAt: string;
  updatedAt: string;
  fromAccount?: {
    id: string;
    user: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  toAccount?: {
    id: string;
    user: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}

export interface BalanceUpdateRequest {
  accountId: string;
  amount: number;
  operation: 'add' | 'subtract';
  reason?: string;
}

// Kafka event types
export interface TransactionCreatedEvent {
  eventType: 'transaction.created';
  transactionId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  timestamp: string;
  userId: string;
}

export interface TransactionCompletedEvent {
  eventType: 'transaction.completed';
  transactionId: string;
  status: 'COMPLETED' | 'FAILED';
  timestamp: string;
  userId: string;
}

export interface AccountBalanceUpdatedEvent {
  eventType: 'account.balance.updated';
  accountId: string;
  previousBalance: number;
  newBalance: number;
  transactionId?: string;
  timestamp: string;
  userId: string;
} 