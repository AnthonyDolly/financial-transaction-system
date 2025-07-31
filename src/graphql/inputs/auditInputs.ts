import { InputType, Field, Int } from 'type-graphql';
import { AuditAction } from '@prisma/client';

@InputType()
export class AuditLogsInput {
  @Field({ nullable: true })
  userId?: string;

  @Field(() => AuditAction, { nullable: true })
  action?: AuditAction;

  @Field({ nullable: true })
  resource?: string;

  @Field({ nullable: true })
  resourceId?: string;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field({ nullable: true })
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field({ nullable: true, defaultValue: 'createdAt' })
  sortBy?: string;

  @Field({ nullable: true, defaultValue: 'desc' })
  sortOrder?: 'asc' | 'desc';
}

@InputType()
export class AuditStatsInput {
  @Field({ nullable: true, defaultValue: 'month' })
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

@InputType()
export class AuditTrailInput {
  @Field()
  resourceType!: string;

  @Field()
  resourceId!: string;
}

@InputType()
export class ExportAuditLogsInput {
  @Field({ nullable: true })
  userId?: string;

  @Field(() => AuditAction, { nullable: true })
  action?: AuditAction;

  @Field({ nullable: true })
  resource?: string;

  @Field({ nullable: true })
  resourceId?: string;

  @Field({ nullable: true })
  startDate?: string;

  @Field({ nullable: true })
  endDate?: string;

  @Field({ nullable: true, defaultValue: 'json' })
  format?: 'json' | 'csv';
} 