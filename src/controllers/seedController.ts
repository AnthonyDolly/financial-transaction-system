import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

const prisma = new PrismaClient();

export class SeedController {
  static executeSeed = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      // Verificar que el usuario sea admin
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        ApiResponseUtil.forbidden(res, 'Only administrators can execute database seed');
        return;
      }

      try {
        logger.info('🌱 Starting seed process...');

        // Limpiar datos existentes
        await prisma.auditLog.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.account.deleteMany();
        await prisma.user.deleteMany();

        logger.info('🧹 Existing data cleaned');

        // Hash para contraseñas
        const passwordHash = await bcrypt.hash(config.DEFAULT_PASSWORD, config.BCRYPT_SALT_ROUNDS);

        // Crear usuarios
        const adminUser = await prisma.user.create({
          data: {
            email: 'admin@financial.com',
            password: passwordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
          },
        });

        const user1 = await prisma.user.create({
          data: {
            email: 'john.doe@example.com',
            password: passwordHash,
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
          },
        });

        const user2 = await prisma.user.create({
          data: {
            email: 'jane.smith@example.com',
            password: passwordHash,
            firstName: 'Jane',
            lastName: 'Smith',
            role: UserRole.USER,
          },
        });

        const user3 = await prisma.user.create({
          data: {
            email: 'bob.johnson@example.com',
            password: passwordHash,
            firstName: 'Bob',
            lastName: 'Johnson',
            role: UserRole.USER,
          },
        });

        logger.info('👥 Users created');

        // Crear cuentas
        const adminAccount = await prisma.account.create({
          data: {
            userId: adminUser.id,
            balance: 100000.0, // $100,000 para admin
            currency: 'USD',
          },
        });

        const account1 = await prisma.account.create({
          data: {
            userId: user1.id,
            balance: 5000.0, // $5,000 para John
            currency: 'USD',
          },
        });

        const account2 = await prisma.account.create({
          data: {
            userId: user2.id,
            balance: 3000.0, // $3,000 para Jane
            currency: 'USD',
          },
        });

        const account3 = await prisma.account.create({
          data: {
            userId: user3.id,
            balance: 1500.0, // $1,500 para Bob
            currency: 'USD',
          },
        });

        logger.info('🏦 Accounts created');

        // Crear algunas transacciones de ejemplo
        await prisma.transaction.createMany({
          data: [
            {
              fromAccountId: account1.id,
              toAccountId: account2.id,
              amount: 250.0,
              description: 'Payment for services',
              status: 'COMPLETED',
              reference: 'TXN-001',
            },
            {
              fromAccountId: account2.id,
              toAccountId: account3.id,
              amount: 150.0,
              description: 'Loan payment',
              status: 'COMPLETED',
              reference: 'TXN-002',
            },
            {
              fromAccountId: adminAccount.id,
              toAccountId: account1.id,
              amount: 1000.0,
              description: 'Initial bonus',
              status: 'COMPLETED',
              reference: 'TXN-003',
            },
          ],
        });

        logger.info('💸 Transactions created');

        // Crear logs de auditoría de ejemplo
        await prisma.auditLog.createMany({
          data: [
            {
              userId: adminUser.id,
              action: 'LOGIN',
              resource: 'User',
              resourceId: adminUser.id,
              ipAddress: '127.0.0.1',
              userAgent: 'Mozilla/5.0 (API Endpoint)',
              metadata: { type: 'seed_data' },
            },
            {
              userId: user1.id,
              action: 'TRANSACTION_CREATE',
              resource: 'Transaction',
              resourceId: 'TXN-001',
              ipAddress: '127.0.0.1',
              userAgent: 'Mozilla/5.0 (API Endpoint)',
              metadata: { amount: 250.0, type: 'seed_data' },
            },
            {
              userId: user2.id,
              action: 'TRANSACTION_COMPLETE',
              resource: 'Transaction',
              resourceId: 'TXN-002',
              ipAddress: '127.0.0.1',
              userAgent: 'Mozilla/5.0 (API Endpoint)',
              metadata: { amount: 150.0, type: 'seed_data' },
            },
          ],
        });

        logger.info('📋 Audit logs created');

        // Actualizar balances después de transacciones
        await prisma.account.update({
          where: { id: account1.id },
          data: { balance: 5750.0 }, // 5000 - 250 + 1000
        });

        await prisma.account.update({
          where: { id: account2.id },
          data: { balance: 3100.0 }, // 3000 + 250 - 150
        });

        await prisma.account.update({
          where: { id: account3.id },
          data: { balance: 1650.0 }, // 1500 + 150
        });

        await prisma.account.update({
          where: { id: adminAccount.id },
          data: { balance: 99000.0 }, // 100000 - 1000
        });

        logger.info('💰 Account balances updated');

        // Obtener estadísticas finales
        const userCount = await prisma.user.count();
        const accountCount = await prisma.account.count();
        const transactionCount = await prisma.transaction.count();
        const auditLogCount = await prisma.auditLog.count();

        const result = {
          message: 'Seed completed successfully!',
          summary: {
            users: userCount,
            accounts: accountCount,
            transactions: transactionCount,
            auditLogs: auditLogCount,
          },
          defaultUsers: {
            admin: 'admin@financial.com',
            user1: 'john.doe@example.com',
            user2: 'jane.smith@example.com',
            user3: 'bob.johnson@example.com',
            password: 'Password123@',
          },
        };

        ApiResponseUtil.success(res, result, 'Database seeded successfully');
        logger.info('✅ Seed completed successfully!');

      } catch (error) {
        logger.error('❌ Error during seed:', error);
        throw error;
      }
    }
  );
} 