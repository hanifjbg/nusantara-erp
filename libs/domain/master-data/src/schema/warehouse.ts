// Skema master gudang: warehouses → zones → bins (rujukan: docs/schema_nusantara.json).
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { tenants, uuidv7 } from '@nusantara-erp/domain-identity';
import { addresses, organizations } from '@nusantara-erp/domain-org';

const tz = (name: string) => timestamp(name, { withTimezone: true });
const pk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7());

export const warehouses = pgTable(
  'warehouses',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    addressId: uuid('address_id').references(() => addresses.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    warehouseCode: varchar('warehouse_code').notNull(),
    warehouseName: varchar('warehouse_name').notNull(),
  },
  (t) => [
    uniqueIndex('warehouses_tenant_code_uidx')
      .on(t.tenantId, t.warehouseCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const warehouseZones = pgTable(
  'warehouse_zones',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    zoneCode: varchar('zone_code').notNull(),
    zoneName: varchar('zone_name').notNull(),
  },
  (t) => [
    uniqueIndex('wh_zones_wh_code_uidx')
      .on(t.warehouseId, t.zoneCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const warehouseBins = pgTable(
  'warehouse_bins',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => warehouseZones.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    binCode: varchar('bin_code').notNull(),
    binName: varchar('bin_name').notNull(),
  },
  (t) => [
    uniqueIndex('wh_bins_zone_code_uidx').on(t.zoneId, t.binCode).where(isNull(t.deletedAt)),
  ],
);
