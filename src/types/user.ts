import { UserRole } from '@prisma/client';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  account?: {
    id: string;
    balance: number;
    currency: string;
    isActive: boolean;
  } | undefined;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    USER: number;
    ADMIN: number;
  };
}

export interface BulkUserOperation {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

export interface UserActivityLog {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: any;
} 

export interface UserActivityQuery {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  from?: string;
  to?: string;   
  sortOrder?: 'asc' | 'desc';
}