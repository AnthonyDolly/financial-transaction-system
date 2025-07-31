export interface AccountResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
  } | undefined;
}

export interface AccountBalanceResponse {
  accountId: string;
  balance: number;
  currency: string;
  availableBalance: number;
  pendingTransactions: number;
  lastUpdated: string;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
}

export interface DepositRequest {
  amount: number;
  description?: string;
  reference?: string;
  source: 'bank_transfer' | 'cash' | 'check' | 'online' | 'other';
}

export interface WithdrawRequest {
  amount: number;
  description?: string;
  reference?: string;
  method: 'atm' | 'bank_counter' | 'online' | 'check' | 'other';
}

export interface AccountStatementQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'createdAt' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: number;
  balance: number;
  description?: string | null;
  reference?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  relatedAccountId?: string | null;
  metadata?: any;
}

export interface AccountStats {
  totalBalance: number;
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  totalTransactions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  averageBalance: number;
  currency: string;
}

export interface FreezeAccountRequest {
  reason: string;
  duration?: number; // days
  notifyUser?: boolean;
}

export interface UnfreezeAccountRequest {
  reason: string;
  notifyUser?: boolean;
}

export interface AccountLimits {
  dailyTransferLimit: number;
  monthlyTransferLimit: number;
  singleTransactionLimit: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
}

export interface SetAccountLimitsRequest {
  limits: Partial<AccountLimits>;
  reason?: string;
}

export interface AccountActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  initiatedBy: {
    id: string;
    email: string;
    role: string;
  };
  metadata?: any;
}

export interface BulkTransferRequest {
  fromAccountId: string;
  transfers: {
    toAccountId: string;
    amount: number;
    description?: string;
    reference?: string;
  }[];
  validateOnly?: boolean;
}

export interface BulkTransferResponse {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: TransferError[];
  totalAmount: number;
  batchId: string;
}

export interface TransferError {
  toAccountId: string;
  amount: number;
  error: string;
  code: string;
}

export interface AccountVerificationRequest {
  accountId: string;
  verificationType: 'identity' | 'address' | 'income' | 'other';
  documents: string[];
  notes?: string;
}

export interface AccountVerificationResponse {
  verificationId: string;
  status: 'pending' | 'verified' | 'rejected';
  verificationType: string;
  submittedAt: string;
  verifiedAt?: string;
  notes?: string;
} 