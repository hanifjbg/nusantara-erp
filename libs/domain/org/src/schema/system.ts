// Skema number_sequences + custom fields + audit_logs (rujukan: docs/schema_nusantara.json).
//
// Catatan audit_logs: parent PARTITION BY RANGE (created_at). Drizzle tidak
// mendukung PARTITION BY deklaratif, jadi migration 0001 di-patch: statement
// CREATE TABLE audit_logs diganti parent terpartisi + partisi berjalan/depan.
// Definisi di bawah (PK komposit id+created_at — syarat Postgres untuk PK di
// tabel terpartisi) dipakai untuk query type-safe; query jalan normal di parent.
import {
  bigint,
  boolean,
  date,
  inet,
  integer,
  jsonb,
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
import { tenants, uuidv7 } from '@nusantara-erp/domain-identity';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const numberSequences = pgTable(
  'number_sequences',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id'),
    currentNumber: bigint('current_number', { mode: 'number' }).default(0).notNull(),
    lastResetAt: date('last_reset_at'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    documentType: varchar('document_type').notNull(),
    formatPattern: varchar('format_pattern').notNull(),
    prefix: varchar('prefix'),
    resetPeriod: varchar('reset_period').default('never').notNull(),
  },
  (t) => [
    // Global per tenant (tanpa org) vs per org — dua partial unique agar
    // NULL organization_id tidak meloloskan duplikat (Postgres: NULL distinct).
    uniqueIndex('number_seq_tenant_doc_uidx')
      .on(t.tenantId, t.documentType)
      .where(sql`${t.deletedAt} IS NULL AND ${t.organizationId} IS NULL`),
    uniqueIndex('number_seq_tenant_doc_org_uidx')
      .on(t.tenantId, t.documentType, t.organizationId)
      .where(isNull(t.deletedAt)),
  ],
);

export const customFieldDefinitions = pgTable(
  'custom_field_definitions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    optionsJson: jsonb('options_json'),
    isRequired: boolean('is_required').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    moduleCode: varchar('module_code').notNull(),
    entityType: varchar('entity_type').notNull(),
    fieldKey: varchar('field_key').notNull(),
    fieldLabel: varchar('field_label').notNull(),
    fieldType: varchar('field_type').notNull(),
  },
  (t) => [
    uniqueIndex('custom_field_def_uidx')
      .on(t.tenantId, t.entityType, t.fieldKey)
      .where(isNull(t.deletedAt)),
  ],
);

export const customFieldValues = pgTable(
  'custom_field_values',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customFieldDefinitionId: uuid('custom_field_definition_id')
      .notNull()
      .references(() => customFieldDefinitions.id),
    entityId: uuid('entity_id').notNull(),
    valueNumber: numeric('value_number'),
    valueDate: date('value_date'),
    valueJson: jsonb('value_json'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    valueText: text('value_text'),
  },
  (t) => [
    uniqueIndex('custom_field_val_uidx')
      .on(t.customFieldDefinitionId, t.entityId)
      .where(isNull(t.deletedAt)),
  ],
);

/** Append-only; tanpa deleted_at/row_version sesuai baseline. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').notNull(),
    entityId: uuid('entity_id'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    actorUserId: uuid('actor_user_id'),
    ipAddress: inet('ip_address'),
    createdAt: tz('created_at').defaultNow().notNull(),
    entityType: varchar('entity_type').notNull(),
    action: varchar('action').notNull(),
  },
  (t) => [primaryKey({ columns: [t.id, t.createdAt] })],
);
