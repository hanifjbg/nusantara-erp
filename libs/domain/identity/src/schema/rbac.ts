// Skema RBAC granular (rujukan: docs/schema_nusantara.json).
// permissions = katalog global (tanpa tenant_id); roles tenant-scoped.
// user_roles: tanpa PK (org/branch nullable) → unique index; lihat catatan di bawah.
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { uuidv7 } from '../uuid';
import { tenants } from './tenants';
import { users } from './users';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    isSystemRole: boolean('is_system_role').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    roleCode: varchar('role_code').notNull(),
    roleName: varchar('role_name').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('roles_tenant_code_uidx')
      .on(t.tenantId, t.roleCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    permissionCode: varchar('permission_code').notNull(),
    permissionName: varchar('permission_name').notNull(),
    moduleCode: varchar('module_code').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('permissions_code_uidx')
      .on(t.permissionCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

// Catatan deviasi sadar: baseline tidak punya id/PK di user_roles, dan
// organization_id/branch_id nullable → composite PK tidak valid di Postgres.
// Dipakai unique index (NULL dianggap distinct) + enforcement di service layer.
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    organizationId: uuid('organization_id'),
    branchId: uuid('branch_id'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
  },
  (t) => [
    uniqueIndex('user_roles_uidx').on(t.userId, t.roleId, t.organizationId, t.branchId),
  ],
);
