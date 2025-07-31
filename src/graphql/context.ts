import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';

export interface GraphQLUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}

export interface GraphQLContext {
  req: Request;
  res: Response;
  user?: GraphQLUser | null;
}

export interface GraphQLContextInput {
  req: Request;
  res: Response;
} 