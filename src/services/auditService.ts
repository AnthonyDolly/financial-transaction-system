import { AuditAction, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { PaginatedResponse, PaginationMeta } from '../types/api';

export interface AuditLogRequest {
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditLogResponse {
  id: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
  };
}

export interface AuditQueryFilters {
  userId?: string;
  action?: AuditAction | AuditAction[];
  resource?: string | string[];
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  userAgent?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByResource: Record<string, number>;
  logsByUser: Array<{
    userId: string;
    userEmail: string;
    count: number;
  }>;
  logsByTimeRange: Array<{
    period: string;
    count: number;
  }>;
  topResources: Array<{
    resource: string;
    count: number;
  }>;
  securityEvents: number;
  failedAttempts: number;
  recentActivity: AuditLogResponse[];
}

export interface SecurityAlert {
  id: string;
  type: 'SUSPICIOUS_ACTIVITY' | 'BRUTE_FORCE' | 'UNUSUAL_ACCESS' | 'DATA_BREACH_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  userId?: string;
  ipAddress?: string;
  metadata: any;
  createdAt: string;
  resolved: boolean;
}

export interface AuditTrail {
  resourceType: string;
  resourceId: string;
  timeline: Array<{
    timestamp: string;
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    changes?: any;
    metadata?: any;
  }>;
}

export class AuditService {
  /**
   * Log audit event - Centralized logging method
   */
  static async logEvent(request: AuditLogRequest): Promise<AuditLogResponse> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: request.userId || null, // Fix: Explicit null conversion
          action: request.action,
          resource: request.resource,
          resourceId: request.resourceId,
          oldValues: request.oldValues || null,
          newValues: request.newValues || null,
          metadata: {
            ...request.metadata,
            sessionId: request.sessionId,
            requestId: request.requestId,
          },
          ipAddress: request.ipAddress || '127.0.0.1',
          userAgent: request.userAgent || 'Unknown',
        },
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

      // Check for security alerts
      await this.analyzeSecurityPatterns(auditLog);

      // Audit event logged successfully
      logger.info('Audit event logged successfully', {
        auditLogId: auditLog.id,
        action: request.action,
        resource: request.resource,
        resourceId: request.resourceId,
      });

      return this.formatAuditLogResponse(auditLog);
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with advanced filtering
   */
  static async getAuditLogs(
    filters: AuditQueryFilters,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    try {
      const {
        userId,
        action,
        resource,
        resourceId,
        startDate,
        endDate,
        ipAddress,
        userAgent,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      // Non-admin users can only see their own logs
      if (requestingUserRole !== UserRole.ADMIN && userId) {
        where.userId = requestingUserId;
      } else if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = Array.isArray(action) ? { in: action } : action;
      }

      if (resource) {
        where.resource = Array.isArray(resource) ? { in: resource } : resource;
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (ipAddress) {
        where.ipAddress = { contains: ipAddress, mode: 'insensitive' };
      }

      if (userAgent) {
        where.userAgent = { contains: userAgent, mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { resource: { contains: search, mode: 'insensitive' } },
          { resourceId: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
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
        }),
        prisma.auditLog.count({ where }),
      ]);

      const auditLogResponses = logs.map(this.formatAuditLogResponse);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      // Log this audit query itself
      await this.logEvent({
        userId: requestingUserId,
        action: AuditAction.READ,
        resource: 'AuditLog',
        resourceId: 'query',
        metadata: {
          filters: filters,
          resultCount: logs.length,
        },
      });

      return {
        success: true,
        data: auditLogResponses,
        meta,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics and analytics
   */
  static async getAuditStats(
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month',
    requestingUserId: string
  ): Promise<AuditStats> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const [
        totalLogs,
        logsByAction,
        logsByResource,
        logsByUser,
        recentLogs,
        securityEvents,
        failedAttempts
      ] = await Promise.all([
        // Total logs count
        prisma.auditLog.count({
          where: { createdAt: { gte: startDate } }
        }),

        // Logs by action
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { _all: true },
        }),

        // Logs by resource - Fixed: Add proper orderBy
        prisma.auditLog.groupBy({
          by: ['resource'],
          where: { createdAt: { gte: startDate } },
          _count: { _all: true },
          orderBy: { resource: 'asc' },
          take: 10,
        }),

        // Logs by user - Fixed: Add proper orderBy  
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: { 
            createdAt: { gte: startDate },
            userId: { not: null }
          },
          _count: { _all: true },
          orderBy: { userId: 'asc' },
          take: 10,
        }),

        // Recent activity
        prisma.auditLog.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: 'desc' },
          take: 20,
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
        }),

        // Security events (failed logins, admin actions, etc.)
        prisma.auditLog.count({
          where: {
            createdAt: { gte: startDate },
            OR: [
              { action: AuditAction.DELETE },
              { resource: 'Security' },
            ],
          },
        }),

        // Failed attempts - Simplified query
        prisma.auditLog.count({
          where: {
            createdAt: { gte: startDate },
            action: AuditAction.LOGIN,
          },
        }),
      ]);

      // Get user details for top users
      const userIds = logsByUser
        .map(log => log.userId)
        .filter((id): id is string => id !== null) as string[];
        
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });

      const userMap = new Map(users.map(user => [user.id, user.email]));

      // Generate time series data
      const logsByTimeRange = await this.generateTimeSeriesData(startDate, now, timeRange);

      await this.logEvent({
        userId: requestingUserId,
        action: AuditAction.READ,
        resource: 'AuditStats',
        resourceId: 'system',
        metadata: { timeRange },
      });

      return {
        totalLogs,
        logsByAction: logsByAction.reduce((acc, item) => {
          acc[item.action] = item._count._all;
          return acc;
        }, {} as Record<string, number>),
        logsByResource: logsByResource.reduce((acc, item) => {
          // Fix: Safe access to _count._all
          const count = item._count && typeof item._count === 'object' && '_all' in item._count 
            ? (item._count as any)._all 
            : 0;
          acc[item.resource] = count;
          return acc;
        }, {} as Record<string, number>),
        logsByUser: logsByUser.map(log => {
          // Fix: Safe access to _count._all
          const count = log._count && typeof log._count === 'object' && '_all' in log._count 
            ? (log._count as any)._all 
            : 0;
          return {
            userId: log.userId!,
            userEmail: userMap.get(log.userId!) || 'Unknown',
            count,
          };
        }),
        logsByTimeRange,
        topResources: logsByResource.map(item => {
          // Fix: Safe access to _count._all
          const count = item._count && typeof item._count === 'object' && '_all' in item._count 
            ? (item._count as any)._all 
            : 0;
          return {
            resource: item.resource,
            count,
          };
        }),
        securityEvents,
        failedAttempts,
        recentActivity: recentLogs.map(this.formatAuditLogResponse),
      };
    } catch (error) {
      logger.error('Get audit stats error:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for specific resource
   */
  static async getResourceAuditTrail(
    resourceType: string,
    resourceId: string,
    requestingUserId: string
  ): Promise<AuditTrail> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          resource: resourceType,
          resourceId: resourceId,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await this.logEvent({
        userId: requestingUserId,
        action: AuditAction.READ,
        resource: 'AuditTrail',
        resourceId: `${resourceType}:${resourceId}`,
      });

      return {
        resourceType,
        resourceId,
        timeline: logs.map(log => {
          // Fix: Create properly typed timeline entry
          const timelineEntry: {
            timestamp: string;
            action: AuditAction;
            userId?: string;
            userEmail?: string;
            changes?: any;
            metadata?: any;
          } = {
            timestamp: log.createdAt.toISOString(),
            action: log.action,
            changes: this.calculateChanges(log.oldValues, log.newValues),
            metadata: log.metadata,
          };

          // Only add userId if it exists
          if (log.userId) {
            timelineEntry.userId = log.userId;
          }

          // Only add userEmail if it exists
          if (log.user?.email) {
            timelineEntry.userEmail = log.user.email;
          }

          return timelineEntry;
        }),
      };
    } catch (error) {
      logger.error('Get resource audit trail error:', error);
      throw error;
    }
  }

  /**
   * Detect security alerts based on audit patterns
   */
  static async getSecurityAlerts(requestingUserId: string): Promise<SecurityAlert[]> {
    try {
      // This is a simplified implementation - in production, you'd use more sophisticated ML/rules
      const recentLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
        include: { user: true },
      });

      const alerts: SecurityAlert[] = [];

      // Check for brute force attempts
      const loginAttempts = recentLogs.filter(log => 
        log.resource === 'User' && log.action === AuditAction.LOGIN
      );

      // Fix: Safe metadata access
      const failedLogins = loginAttempts.filter(log => {
        if (log.metadata && typeof log.metadata === 'object' && 'success' in log.metadata) {
          return (log.metadata as any).success === false;
        }
        return false;
      });

      if (failedLogins.length > 10) {
        alerts.push({
          id: `brute-force-${Date.now()}`,
          type: 'BRUTE_FORCE',
          severity: 'HIGH',
          description: `${failedLogins.length} failed login attempts detected in the last 24 hours`,
          metadata: { count: failedLogins.length },
          createdAt: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for unusual admin activity - Fix: Proper type handling
      const adminActions = recentLogs.filter(log => 
        log.user?.role === UserRole.ADMIN && 
        (log.action === AuditAction.DELETE || log.action === AuditAction.UPDATE)
      );

      if (adminActions.length > 50) {
        alerts.push({
          id: `admin-activity-${Date.now()}`,
          type: 'UNUSUAL_ACCESS',
          severity: 'MEDIUM',
          description: `Unusual high volume of admin actions: ${adminActions.length} in last 24 hours`,
          metadata: { count: adminActions.length },
          createdAt: new Date().toISOString(),
          resolved: false,
        });
      }

      await this.logEvent({
        userId: requestingUserId,
        action: AuditAction.READ,
        resource: 'SecurityAlert',
        resourceId: 'system',
        metadata: { alertCount: alerts.length },
      });

      return alerts;
    } catch (error) {
      logger.error('Get security alerts error:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  static async exportAuditLogs(
    filters: AuditQueryFilters,
    format: 'json' | 'csv',
    requestingUserId: string
  ): Promise<{ data: any; filename: string }> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: this.buildWhereClause(filters),
        orderBy: { createdAt: 'desc' },
        take: 10000, // Limit for export
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

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `audit-logs-${timestamp}.${format}`;

      let exportData: any;

      if (format === 'json') {
        exportData = logs.map(this.formatAuditLogResponse);
      } else {
        // CSV format
        const csvRows = logs.map(log => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          user: log.user?.email || 'System',
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        }));
        exportData = csvRows;
      }

      await this.logEvent({
        userId: requestingUserId,
        action: AuditAction.READ,
        resource: 'AuditExport',
        resourceId: filename,
        metadata: {
          format,
          recordCount: logs.length,
          filters,
        },
      });

      return { data: exportData, filename };
    } catch (error) {
      logger.error('Export audit logs error:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static formatAuditLogResponse(log: any): AuditLogResponse {
    // Fix: Create properly typed response
    const response: AuditLogResponse = {
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    };

    // Only add userId if it exists
    if (log.userId) {
      response.userId = log.userId;
    }

    // Only add ipAddress if it exists
    if (log.ipAddress) {
      response.ipAddress = log.ipAddress;
    }

    // Only add userAgent if it exists
    if (log.userAgent) {
      response.userAgent = log.userAgent;
    }

    // Only add user if it exists
    if (log.user) {
      response.user = {
        id: log.user.id,
        email: log.user.email,
        firstName: log.user.firstName || undefined,
        lastName: log.user.lastName || undefined,
        role: log.user.role,
      };
    }

    return response;
  }

  private static buildWhereClause(filters: AuditQueryFilters): any {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) {
      where.action = Array.isArray(filters.action) ? { in: filters.action } : filters.action;
    }
    if (filters.resource) {
      where.resource = Array.isArray(filters.resource) ? { in: filters.resource } : filters.resource;
    }
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return where;
  }

  private static calculateChanges(oldValues: any, newValues: any): any {
    if (!oldValues || !newValues) return null;

    const changes: any = {};
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);

    allKeys.forEach(key => {
      const oldVal = oldValues?.[key];
      const newVal = newValues?.[key];

      if (oldVal !== newVal) {
        changes[key] = { from: oldVal, to: newVal };
      }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private static async generateTimeSeriesData(
    startDate: Date,
    endDate: Date,
    interval: string
  ): Promise<Array<{ period: string; count: number }>> {
    // Simplified time series - in production you'd use SQL window functions
    const data: Array<{ period: string; count: number }> = [];
    
    let current = new Date(startDate);
    while (current <= endDate) {
      let next = new Date(current);
      let periodLabel = '';

      switch (interval) {
        case 'day':
          next.setHours(current.getHours() + 1);
          periodLabel = current.toISOString().substring(0, 13) + ':00';
          break;
        case 'week':
          next.setDate(current.getDate() + 1);
          // Fix: Safe array access
          const weekParts = current.toISOString().split('T');
          periodLabel = weekParts[0] || current.toISOString().substring(0, 10);
          break;
        case 'month':
          next.setDate(current.getDate() + 1);
          // Fix: Safe array access
          const monthParts = current.toISOString().split('T');
          periodLabel = monthParts[0] || current.toISOString().substring(0, 10);
          break;
        case 'year':
          next.setMonth(current.getMonth() + 1);
          periodLabel = current.toISOString().substring(0, 7);
          break;
      }

      const count = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: current,
            lt: next,
          },
        },
      });

      data.push({ period: periodLabel, count });
      current = next;
    }

    return data;
  }

  private static async analyzeSecurityPatterns(auditLog: any): Promise<void> {
    // Simplified security analysis - in production you'd use ML models
    if (auditLog.action === AuditAction.LOGIN) {
      // Fix: Safe metadata access
      let isFailedLogin = false;
      if (auditLog.metadata && typeof auditLog.metadata === 'object' && 'success' in auditLog.metadata) {
        isFailedLogin = (auditLog.metadata as any).success === false;
      }

      if (isFailedLogin) {
        const recentFailures = await prisma.auditLog.count({
          where: {
            userId: auditLog.userId,
            action: AuditAction.LOGIN,
            createdAt: {
              gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
            },
          },
        });

        if (recentFailures > 5) {
          logger.warn(`Potential brute force attack detected for user ${auditLog.userId}`);
          // Here you could trigger alerts, notifications, etc.
        }
      }
    }
  }
} 