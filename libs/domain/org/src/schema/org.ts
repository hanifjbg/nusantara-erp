// Skema struktur organisasi (rujukan: docs/schema_nusantara.json).
// Semua tabel tenant-scoped. user_organizations = keanggotaan multi-org user.
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { tenants, users, uuidv7 } from '@nusantara-erp/domain-identity';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    parentOrganizationId: uuid('parent_organization_id'),
    addressId: uuid('address_id'),
    fiscalYearStartMonth: integer('fiscal_year_start_month').default(1),
    employeeCount: integer('employee_count').default(0).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    orgCode: varchar('org_code').notNull(),
    legalName: varchar('legal_name').notNull(),
    brandName: varchar('brand_name'),
    npwp: varchar('npwp'),
    nib: varchar('nib'),
    kbliCode: varchar('kbli_code'),
    logoUrl: text('logo_url'),
    website: varchar('website'),
    email: varchar('email'),
    phone: varchar('phone'),
    fax: varchar('fax'),
    industry: varchar('industry'),
  },
  (t) => [
    uniqueIndex('organizations_tenant_code_uidx')
      .on(t.tenantId, t.orgCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const userOrganizations = pgTable(
  'user_organizations',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organizationId] })],
);

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    addressId: uuid('address_id'),
    managerUserId: uuid('manager_user_id'),
    isHeadOffice: boolean('is_head_office').default(false).notNull(),
    openingDate: date('opening_date'),
    closingDate: date('closing_date'),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    branchCode: varchar('branch_code').notNull(),
    branchName: varchar('branch_name').notNull(),
    phone: varchar('phone'),
    email: varchar('email'),
    fax: varchar('fax'),
  },
  (t) => [
    uniqueIndex('branches_tenant_code_uidx')
      .on(t.tenantId, t.branchCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    parentDepartmentId: uuid('parent_department_id'),
    managerUserId: uuid('manager_user_id'),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    departmentCode: varchar('department_code').notNull(),
    departmentName: varchar('department_name').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('departments_tenant_code_uidx')
      .on(t.tenantId, t.departmentCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const costCenters = pgTable(
  'cost_centers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    departmentId: uuid('department_id').references(() => departments.id),
    budgetOwnerUserId: uuid('budget_owner_user_id'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    costCenterCode: varchar('cost_center_code').notNull(),
    costCenterName: varchar('cost_center_name').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('cost_centers_tenant_code_uidx')
      .on(t.tenantId, t.costCenterCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const reportingLines = pgTable('reporting_lines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  employeeUserId: uuid('employee_user_id')
    .notNull()
    .references(() => users.id),
  managerUserId: uuid('manager_user_id')
    .notNull()
    .references(() => users.id),
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  deletedAt: tz('deleted_at'),
  rowVersion: integer('row_version').default(1).notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const jobGrades = pgTable(
  'job_grades',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    salaryMin: numeric('salary_min'),
    salaryMax: numeric('salary_max'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    gradeCode: varchar('grade_code').notNull(),
    gradeName: varchar('grade_name'),
  },
  (t) => [
    uniqueIndex('job_grades_tenant_code_uidx')
      .on(t.tenantId, t.gradeCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const jobPositions = pgTable(
  'job_positions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    departmentId: uuid('department_id').references(() => departments.id),
    jobGradeId: uuid('job_grade_id').references(() => jobGrades.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    positionCode: varchar('position_code').notNull(),
    positionName: varchar('position_name').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('job_positions_tenant_code_uidx')
      .on(t.tenantId, t.positionCode)
      .where(isNull(t.deletedAt)),
  ],
);
