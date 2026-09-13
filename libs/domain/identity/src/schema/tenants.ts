// Skema tenants + tenant_settings + feature_flags (rujukan: docs/schema_nusantara.json).
// tenants = root multi-tenancy (tanpa tenant_id). settings/flags tenant-scoped.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { uuidv7 } from '../uuid';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    // FK ke fase lain (subscription_plans Fase 21, currencies Fase 2, addresses Fase 1-tahap-ini):
    // sengaja tanpa .references() agar tidak ada dependensi maju (forward dep).
    subscriptionPlanId: uuid('subscription_plan_id'),
    defaultCurrencyId: uuid('default_currency_id'),
    billingAddressId: uuid('billing_address_id'),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    tenantCode: varchar('tenant_code').notNull(),
    tenantName: varchar('tenant_name').notNull(),
    subdomain: varchar('subdomain'),
    isolationStrategy: varchar('isolation_strategy').default('shared_schema'),
    status: varchar('status').default('active').notNull(),
    defaultLocale: varchar('default_locale').default('id'),
    timezone: varchar('timezone').default('Asia/Jakarta'),
    logoUrl: text('logo_url'),
    contactEmail: varchar('contact_email'),
    contactPhone: varchar('contact_phone'),
  },
  (t) => [
    // Soft-delete friendly: kode unik hanya di antara baris aktif.
    uniqueIndex('tenants_code_uidx').on(t.tenantCode).where(isNull(t.deletedAt)),
  ],
);

export const tenantSettings = pgTable(
  'tenant_settings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    settingValue: jsonb('setting_value'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    settingKey: varchar('setting_key').notNull(),
  },
  (t) => [
    uniqueIndex('tenant_settings_tenant_key_uidx')
      .on(t.tenantId, t.settingKey)
      .where(isNull(t.deletedAt)),
  ],
);

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    rolloutPercentage: smallint('rollout_percentage').default(0).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    flagKey: varchar('flag_key').notNull(),
  },
  (t) => [
    uniqueIndex('feature_flags_tenant_key_uidx')
      .on(t.tenantId, t.flagKey)
      .where(isNull(t.deletedAt)),
  ],
);
