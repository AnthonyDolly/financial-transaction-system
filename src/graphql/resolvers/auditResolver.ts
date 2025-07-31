import { Resolver, Query, Arg, Ctx, Authorized } from 'type-graphql';
import { AuditService } from '../../services/auditService';
import {
  AuditLogConnection,
  AuditStatsType,
  AuditTrailType,
  SecurityAlertType,
  ExportResult,
  AuditLogType,
  AuditUser,
  AuditTrailEvent,
} from '../../graphql/types/auditTypes';
import {
  AuditLogsInput,
  AuditStatsInput,
  AuditTrailInput,
  ExportAuditLogsInput,
} from '../../graphql/inputs/auditInputs';
import { GraphQLContext } from '../../graphql/context';
import { UserRole } from '@prisma/client';

@Resolver()
export class AuditResolver {
  /**
   * Helper method to map audit log data safely
   */
  private mapAuditLog(log: any): AuditLogType {
    const mapped = new AuditLogType();
    mapped.id = log.id;
    mapped.userId = log.userId || undefined;
    mapped.action = log.action;
    mapped.resource = log.resource;
    mapped.resourceId = log.resourceId;
    mapped.oldValues = log.oldValues;
    mapped.newValues = log.newValues;
    mapped.metadata = log.metadata;
    mapped.ipAddress = log.ipAddress || undefined;
    mapped.userAgent = log.userAgent || undefined;
    mapped.createdAt = new Date(log.createdAt);

    // Crear una instancia real de AuditUser si existe el usuario
    if (log.user) {
      const auditUser = new AuditUser();
      auditUser.id = log.user.id;
      auditUser.email = log.user.email;
      auditUser.firstName = log.user.firstName;
      auditUser.lastName = log.user.lastName;
      auditUser.role = log.user.role;
      mapped.user = auditUser;
    }
    // Si no hay usuario, mapped.user será undefined por defecto

    return mapped;
  }

  /**
   * Get audit logs with advanced filtering
   * Accessible by: Admin (all logs) or Users (their own logs)
   */
  @Authorized()
  @Query(() => AuditLogConnection)
  async auditLogs(
    @Arg('input', { nullable: true }) input: AuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditLogConnection> {
    const { user } = context;
    if (!user) {
      throw new Error('Not authenticated');
    }
    // Non-admin users can only see their own logs
    if (user.role !== UserRole.ADMIN) {
      input.userId = user.id;
    }

    // Build filters object safely
    const filters: any = {};
    if (input.userId) filters.userId = input.userId;
    if (input.action) filters.action = input.action;
    if (input.resource) filters.resource = input.resource;
    if (input.resourceId) filters.resourceId = input.resourceId;
    if (input.startDate) filters.startDate = input.startDate;
    if (input.endDate) filters.endDate = input.endDate;
    if (input.ipAddress) filters.ipAddress = input.ipAddress;
    if (input.userAgent) filters.userAgent = input.userAgent;
    if (input.search) filters.search = input.search;
    if (input.page !== undefined) filters.page = input.page;
    if (input.limit !== undefined) filters.limit = input.limit;
    if (input.sortBy) filters.sortBy = input.sortBy;
    if (input.sortOrder) filters.sortOrder = input.sortOrder;

    const result = await AuditService.getAuditLogs(filters, user.id, user.role);

    const connection = new AuditLogConnection();
    connection.data = result.data.map((log: any) => this.mapAuditLog(log));
    connection.meta = {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    };
    connection.success = result.success;
    connection.timestamp = new Date(result.timestamp);

    return connection;
  }

  /**
   * Get audit statistics and analytics
   * Admin only
   */
  @Authorized(['ADMIN'])
  @Query(() => AuditStatsType)
  async auditStats(
    @Arg('input', { nullable: true }) input: AuditStatsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditStatsType> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    const stats = await AuditService.getAuditStats(input.timeRange || 'month', user.id);

    const result = new AuditStatsType();
    result.totalLogs = stats.totalLogs;
    result.logsByAction = Object.entries(stats.logsByAction).map(([action, count]) => ({
      action: action as any,
      count,
    }));
    result.logsByResource = Object.entries(stats.logsByResource).map(([resource, count]) => ({
      resource,
      count,
    }));
    result.logsByUser = stats.logsByUser.map(stat => ({
      userId: stat.userId,
      userEmail: stat.userEmail,
      count: stat.count,
    }));
    result.logsByTimeRange = stats.logsByTimeRange.map(item => ({
      period: item.period,
      count: item.count,
    }));
    result.topResources = stats.topResources.map(item => ({
      resource: item.resource,
      count: item.count,
    }));
    result.securityEvents = stats.securityEvents;
    result.failedAttempts = stats.failedAttempts;
    result.recentActivity = stats.recentActivity.map(log => this.mapAuditLog(log));

    return result;
  }

  /**
   * Get audit trail for a specific resource
   * Admin only (for now - could be extended to allow users to see their own resource trails)
   */
  @Authorized(['ADMIN'])
  @Query(() => AuditTrailType)
  async auditTrail(
    @Arg('input') input: AuditTrailInput,
    @Ctx() context: GraphQLContext
  ): Promise<AuditTrailType> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    const trail = await AuditService.getResourceAuditTrail(
      input.resourceType,
      input.resourceId,
      user.id
    );

    const result = new AuditTrailType();
    result.resourceType = trail.resourceType;
    result.resourceId = trail.resourceId;

    // Crear instancias reales de AuditTrailEvent
    result.timeline = trail.timeline.map(event => {
      const trailEvent = new AuditTrailEvent();
      trailEvent.timestamp = new Date(event.timestamp);
      trailEvent.action = event.action;
      trailEvent.userId = event.userId!;
      trailEvent.userEmail = event.userEmail!;
      trailEvent.changes = event.changes;
      trailEvent.metadata = event.metadata;
      return trailEvent;
    });

    return result;
  }

  /**
   * Get security alerts
   * Admin only
   */
  @Authorized(['ADMIN'])
  @Query(() => [SecurityAlertType])
  async securityAlerts(@Ctx() context: GraphQLContext): Promise<SecurityAlertType[]> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    const alerts = await AuditService.getSecurityAlerts(user.id);

    return alerts.map(alert => {
      const mapped = new SecurityAlertType();
      mapped.id = alert.id;
      mapped.type = alert.type;
      mapped.severity = alert.severity;
      mapped.description = alert.description;
      mapped.userId = alert.userId!;
      mapped.ipAddress = alert.ipAddress!;
      mapped.metadata = alert.metadata;
      mapped.createdAt = new Date(alert.createdAt);
      mapped.resolved = alert.resolved;
      return mapped;
    });
  }

  /**
   * Export audit logs for compliance
   * Admin only
   */
  @Authorized(['ADMIN'])
  @Query(() => ExportResult)
  async exportAuditLogs(
    @Arg('input', { nullable: true }) input: ExportAuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<ExportResult> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    // Build filters object safely
    const filters: any = {};
    if (input.userId) filters.userId = input.userId;
    if (input.action) filters.action = input.action;
    if (input.resource) filters.resource = input.resource;
    if (input.resourceId) filters.resourceId = input.resourceId;
    if (input.startDate) filters.startDate = input.startDate;
    if (input.endDate) filters.endDate = input.endDate;

    const exportResult = await AuditService.exportAuditLogs(
      filters,
      input.format || 'json',
      user.id
    );

    const result = new ExportResult();
    result.filename = exportResult.filename;
    result.data = exportResult.data;
    result.recordCount = Array.isArray(exportResult.data) ? exportResult.data.length : 0;

    return result;
  }

  /**
   * Get my audit logs (current user)
   * All authenticated users can access their own logs
   */
  @Authorized()
  @Query(() => AuditLogConnection)
  async myAuditLogs(
    @Arg('input', { nullable: true }) input: AuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditLogConnection> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    // Force userId to current user for security
    input.userId = user.id;

    return this.auditLogs(input, context);
  }

  /**
   * Search audit logs with advanced text search
   * Admin only
   */
  @Authorized(['ADMIN'])
  @Query(() => AuditLogConnection)
  async searchAuditLogs(
    @Arg('query') query: string,
    @Arg('input', { nullable: true }) input: AuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditLogConnection> {
    input.search = query;
    return this.auditLogs(input, context);
  }

  /**
   * Get audit logs by resource type
   * Admin only
   */
  @Authorized(['ADMIN'])
  @Query(() => AuditLogConnection)
  async auditLogsByResource(
    @Arg('resource') resource: string,
    @Arg('input', { nullable: true }) input: AuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditLogConnection> {
    input.resource = resource;
    return this.auditLogs(input, context);
  }

  /**
   * Get audit logs by user
   * Admin only (except when querying own logs)
   */
  @Authorized()
  @Query(() => AuditLogConnection)
  async auditLogsByUser(
    @Arg('userId') userId: string,
    @Arg('input', { nullable: true }) input: AuditLogsInput = {},
    @Ctx() context: GraphQLContext
  ): Promise<AuditLogConnection> {
    const { user } = context;

    if (!user) {
      throw new Error('Not authenticated');
    }
    // Non-admin users can only query their own logs
    if (user.role !== UserRole.ADMIN && userId !== user.id) {
      throw new Error('You can only access your own audit logs');
    }

    input.userId = userId;
    return this.auditLogs(input, context);
  }
}
