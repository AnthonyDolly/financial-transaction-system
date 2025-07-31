import { UserRole, TransactionType, TransactionStatus, AuditAction, NotificationType } from '@prisma/client';

/**
 * Base Event Interface
 */
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  traceId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction Events
 */
export interface TransactionCreatedEvent extends BaseEvent {
  eventType: 'transaction.created';
  payload: {
    transactionId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    type: TransactionType;
    description?: string;
    reference?: string;
    externalRef?: string;
    status: TransactionStatus;
    fee?: number;
    scheduledFor?: string;
  };
}

export interface TransactionUpdatedEvent extends BaseEvent {
  eventType: 'transaction.updated';
  payload: {
    transactionId: string;
    previousStatus: TransactionStatus;
    newStatus: TransactionStatus;
    updatedFields: string[];
    reason?: string;
    processingTime?: number;
  };
}

export interface TransactionCompletedEvent extends BaseEvent {
  eventType: 'transaction.completed';
  payload: {
    transactionId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    completedAt: string;
    processingTime: number;
    finalBalance: {
      fromAccount: number;
      toAccount: number;
    };
  };
}

export interface TransactionFailedEvent extends BaseEvent {
  eventType: 'transaction.failed';
  payload: {
    transactionId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    failedReason: string;
    failedAt: string;
    errorCode?: string;
  };
}

export interface TransactionReversedEvent extends BaseEvent {
  eventType: 'transaction.reversed';
  payload: {
    originalTransactionId: string;
    reversalTransactionId: string;
    amount: number;
    reason: string;
    reversedAt: string;
  };
}

/**
 * Account Events
 */
export interface AccountCreatedEvent extends BaseEvent {
  eventType: 'account.created';
  payload: {
    accountId: string;
    userId: string;
    accountNumber: string;
    accountType: string;
    balance: number;
    currency: string;
    limits: {
      dailyTransferLimit?: number;
      weeklyTransferLimit?: number;
      monthlyTransferLimit?: number;
      singleTransferLimit?: number;
    };
  };
}

export interface AccountUpdatedEvent extends BaseEvent {
  eventType: 'account.updated';
  payload: {
    accountId: string;
    updatedFields: string[];
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
  };
}

export interface AccountBalanceChangedEvent extends BaseEvent {
  eventType: 'account.balance.changed';
  payload: {
    accountId: string;
    transactionId?: string;
    previousBalance: number;
    newBalance: number;
    changeAmount: number;
    changeType: 'CREDIT' | 'DEBIT';
    reason: string;
  };
}

export interface AccountLimitsUpdatedEvent extends BaseEvent {
  eventType: 'account.limits.updated';
  payload: {
    accountId: string;
    previousLimits: Record<string, number>;
    newLimits: Record<string, number>;
    updatedBy: string;
  };
}

/**
 * User Events
 */
export interface UserCreatedEvent extends BaseEvent {
  eventType: 'user.created';
  payload: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    isActive: boolean;
    createdBy?: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  eventType: 'user.updated';
  payload: {
    userId: string;
    updatedFields: string[];
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    updatedBy?: string;
  };
}

export interface UserLoginEvent extends BaseEvent {
  eventType: 'user.login';
  payload: {
    userId: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    loginAt: string;
    loginMethod: 'EMAIL_PASSWORD' | 'REFRESH_TOKEN';
    success: boolean;
    failureReason?: string;
  };
}

export interface UserLogoutEvent extends BaseEvent {
  eventType: 'user.logout';
  payload: {
    userId: string;
    sessionId: string;
    logoutAt: string;
    logoutType: 'MANUAL' | 'TIMEOUT' | 'FORCED';
  };
}

/**
 * Audit Events
 */
export interface AuditLogCreatedEvent extends BaseEvent {
  eventType: 'audit.log.created';
  payload: {
    auditLogId: string;
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress: string;
    userAgent: string;
  };
}

export interface SecurityAlertGeneratedEvent extends BaseEvent {
  eventType: 'security.alert.generated';
  payload: {
    alertId: string;
    alertType: 'SUSPICIOUS_ACTIVITY' | 'BRUTE_FORCE' | 'UNUSUAL_ACCESS' | 'DATA_BREACH_ATTEMPT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    affectedUserId?: string;
    ipAddress?: string;
    detectionRule: string;
    evidence: Record<string, any>;
  };
}

/**
 * Notification Events
 */
export interface NotificationCreatedEvent extends BaseEvent {
  eventType: 'notification.created';
  payload: {
    notificationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH')[];
    scheduledFor?: string;
    expiresAt?: string;
    relatedResource?: {
      type: string;
      id: string;
    };
  };
}

export interface NotificationSentEvent extends BaseEvent {
  eventType: 'notification.sent';
  payload: {
    notificationId: string;
    userId: string;
    channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
    status: 'SENT' | 'DELIVERED' | 'FAILED';
    sentAt: string;
    deliveryId?: string;
    provider?: string;
  };
}

export interface NotificationFailedEvent extends BaseEvent {
  eventType: 'notification.failed';
  payload: {
    notificationId: string;
    userId: string;
    channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
    failedAt: string;
    error: string;
    retryCount: number;
    nextRetryAt?: string;
  };
}

/**
 * System Events
 */
export interface SystemErrorEvent extends BaseEvent {
  eventType: 'system.error';
  payload: {
    errorId: string;
    errorType: string;
    message: string;
    stack?: string;
    component: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedUsers?: string[];
    context: Record<string, any>;
  };
}

export interface SystemHealthCheckEvent extends BaseEvent {
  eventType: 'system.health.check';
  payload: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    checks: {
      database: boolean;
      redis: boolean;
      kafka: boolean;
      external_apis: boolean;
    };
    response_time: number;
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

/**
 * Union type of all events
 */
export type KafkaEvent = 
  | TransactionCreatedEvent
  | TransactionUpdatedEvent
  | TransactionCompletedEvent
  | TransactionFailedEvent
  | TransactionReversedEvent
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountBalanceChangedEvent
  | AccountLimitsUpdatedEvent
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserLoginEvent
  | UserLogoutEvent
  | AuditLogCreatedEvent
  | SecurityAlertGeneratedEvent
  | NotificationCreatedEvent
  | NotificationSentEvent
  | NotificationFailedEvent
  | SystemErrorEvent
  | SystemHealthCheckEvent;

/**
 * Event Type Guards
 */
export const isTransactionEvent = (event: KafkaEvent): event is TransactionCreatedEvent | TransactionUpdatedEvent | TransactionCompletedEvent | TransactionFailedEvent | TransactionReversedEvent => {
  return event.eventType.startsWith('transaction.');
};

export const isAccountEvent = (event: KafkaEvent): event is AccountCreatedEvent | AccountUpdatedEvent | AccountBalanceChangedEvent | AccountLimitsUpdatedEvent => {
  return event.eventType.startsWith('account.');
};

export const isUserEvent = (event: KafkaEvent): event is UserCreatedEvent | UserUpdatedEvent | UserLoginEvent | UserLogoutEvent => {
  return event.eventType.startsWith('user.');
};

export const isAuditEvent = (event: KafkaEvent): event is AuditLogCreatedEvent | SecurityAlertGeneratedEvent => {
  return event.eventType.startsWith('audit.') || event.eventType.startsWith('security.');
};

export const isNotificationEvent = (event: KafkaEvent): event is NotificationCreatedEvent | NotificationSentEvent | NotificationFailedEvent => {
  return event.eventType.startsWith('notification.');
};

export const isSystemEvent = (event: KafkaEvent): event is SystemErrorEvent | SystemHealthCheckEvent => {
  return event.eventType.startsWith('system.');
}; 