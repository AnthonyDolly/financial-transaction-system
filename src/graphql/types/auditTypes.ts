import { ObjectType, Field, ID, registerEnumType, Int, Float } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { AuditAction, UserRole } from '@prisma/client';

// Register enums for GraphQL
registerEnumType(AuditAction, {
  name: 'AuditAction',
  description: 'Audit actions that can be performed in the system',
});

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User roles in the system',
});

@ObjectType()
export class PaginationMeta {
  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNext!: boolean;

  @Field()
  hasPrev!: boolean;
}

@ObjectType()
export class AuditUser {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(() => UserRole)
  role!: UserRole;
}

@ObjectType()
export class AuditLogType {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => AuditAction)
  action!: AuditAction;

  @Field()
  resource!: string;

  @Field()
  resourceId!: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  oldValues?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  newValues?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field()
  createdAt!: Date;

  @Field(() => AuditUser, { nullable: true })
  user?: AuditUser;
}

@ObjectType()
export class AuditLogConnection {
  @Field(() => [AuditLogType])
  data!: AuditLogType[];

  @Field(() => PaginationMeta)
  meta!: PaginationMeta;

  @Field()
  success!: boolean;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class AuditActionStat {
  @Field(() => AuditAction)
  action!: AuditAction;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class ResourceStat {
  @Field()
  resource!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class UserStat {
  @Field()
  userId!: string;

  @Field()
  userEmail!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class TimeSeriesData {
  @Field()
  period!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class AuditStatsType {
  @Field(() => Int)
  totalLogs!: number;

  @Field(() => [AuditActionStat])
  logsByAction!: AuditActionStat[];

  @Field(() => [ResourceStat])
  logsByResource!: ResourceStat[];

  @Field(() => [UserStat])
  logsByUser!: UserStat[];

  @Field(() => [TimeSeriesData])
  logsByTimeRange!: TimeSeriesData[];

  @Field(() => [ResourceStat])
  topResources!: ResourceStat[];

  @Field(() => Int)
  securityEvents!: number;

  @Field(() => Int)
  failedAttempts!: number;

  @Field(() => [AuditLogType])
  recentActivity!: AuditLogType[];
}

@ObjectType()
export class AuditTrailEvent {
  @Field()
  timestamp!: Date;

  @Field(() => AuditAction)
  action!: AuditAction;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  userEmail?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  changes?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;
}

@ObjectType()
export class AuditTrailType {
  @Field()
  resourceType!: string;

  @Field()
  resourceId!: string;

  @Field(() => [AuditTrailEvent])
  timeline!: AuditTrailEvent[];
}

@ObjectType()
export class SecurityAlertType {
  @Field(() => ID)
  id!: string;

  @Field()
  type!: string;

  @Field()
  severity!: string;

  @Field()
  description!: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field(() => GraphQLJSONObject)
  metadata!: any;

  @Field()
  createdAt!: Date;

  @Field()
  resolved!: boolean;
}

@ObjectType()
export class ExportResult {
  @Field()
  filename!: string;

  @Field(() => GraphQLJSONObject)
  data!: any;

  @Field(() => Int)
  recordCount!: number;
} 