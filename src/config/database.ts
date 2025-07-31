import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from './env';

declare global {
  var __prisma: PrismaClient | undefined;
}

class DatabaseConnection {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      if (globalThis.__prisma) {
        DatabaseConnection.instance = globalThis.__prisma;
      } else {
        DatabaseConnection.instance = new PrismaClient({
          log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });

        // In development, save the instance to global to avoid multiple connections
        if (config.NODE_ENV === 'development') {
          globalThis.__prisma = DatabaseConnection.instance;
        }
      }
    }

    return DatabaseConnection.instance;
  }

  public static async connect(): Promise<void> {
    try {
      await DatabaseConnection.getInstance().$connect();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    try {
      await DatabaseConnection.getInstance().$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      await DatabaseConnection.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const prisma = DatabaseConnection.getInstance();
export default DatabaseConnection; 