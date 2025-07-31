import { Request } from 'express';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: UserPayload;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UserPayload {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: 'USER' | 'ADMIN';
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Request object with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface AuthMiddlewareOptions {
  roles?: ('USER' | 'ADMIN')[];
  optional?: boolean;
} 