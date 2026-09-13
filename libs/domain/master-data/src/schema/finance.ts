// Skema master keuangan: currencies (global), exchange_rates, chart_of_accounts,
// fiscal_periods, tax_codes (rujukan: docs/schema_nusantara.json).
import {
  boolean,
  char,
  date,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { tenants, uuidv7 } from '@nusantara-erp/domain-identity';
import { organizations } from '@nusantara-erp/domain-org';

const tz = (name: string) => timestamp(name, { withTimezone: true });
const pk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7());

/** Referensi global (tanpa tenant_id) — di-seed via POST /master/currencies/seed. */
export const currencies = pgTable(
  'currencies',
  {
    id: pk(),
    decimalPlaces: smallint('decimal_places').default(2).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    currencyName: varchar('currency_name').notNull(),
    symbol: varchar('symbol'),
  },
  (t) => [uniqueIndex('currencies_code_uidx').on(t.currencyCode).where(isNull(t.deletedAt))],
);

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    baseCurrencyId: uuid('base_currency_id')
      .notNull()
      .references(() => currencies.id),
    targetCurrencyId: uuid('target_currency_id')
      .notNull()
      .references(() => currencies.id),
    rate: numeric('rate').notNull(),
    effectiveDate: date('effective_date').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    uniqueIndex('exchange_rates_uidx')
      .on(t.tenantId, t.baseCurrencyId, t.targetCurrencyId, t.effectiveDate)
      .where(isNull(t.deletedAt)),
  ],
);

export const chartOfAccounts = pgTable(
  'chart_of_accounts',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    parentAccountId: uuid('parent_account_id'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    accountCode: varchar('account_code').notNull(),
    accountName: varchar('account_name').notNull(),
    accountType: varchar('account_type').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('coa_tenant_code_uidx')
      .on(t.tenantId, t.accountCode)
      .where(sql`${t.deletedAt} IS NULL AND ${t.organizationId} IS NULL`),
    uniqueIndex('coa_tenant_org_code_uidx')
      .on(t.tenantId, t.organizationId, t.accountCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const fiscalPeriods = pgTable(
  'fiscal_periods',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    isClosed: boolean('is_closed').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    periodName: varchar('period_name').notNull(),
  },
  (t) => [
    uniqueIndex('fiscal_tenant_name_uidx')
      .on(t.tenantId, t.periodName)
      .where(sql`${t.deletedAt} IS NULL AND ${t.organizationId} IS NULL`),
    uniqueIndex('fiscal_tenant_org_name_uidx')
      .on(t.tenantId, t.organizationId, t.periodName)
      .where(isNull(t.deletedAt)),
  ],
);

export const taxCodes = pgTable(
  'tax_codes',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ratePercentage: numeric('rate_percentage').notNull(),
    effectiveDate: date('effective_date').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    taxCode: varchar('tax_code').notNull(),
    taxName: varchar('tax_name').notNull(),
    taxType: varchar('tax_type').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('tax_codes_tenant_code_uidx')
      .on(t.tenantId, t.taxCode)
      .where(isNull(t.deletedAt)),
  ],
);
