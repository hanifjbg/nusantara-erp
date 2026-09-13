// Skema inventory Fase 4 (rujukan: docs/fase-04-inventory.md, migrasi 0008/0009).
// stock_movements = parent PARTITION BY RANGE (movement_at); PK komposit
// (id, movement_at) mengikuti preseden audit_logs (syarat PG untuk unique di tabel partisi).
import {
  integer,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull } from 'drizzle-orm';
import { tenants, uuidv7 } from '@nusantara-erp/domain-identity';
import { items, warehouses } from '@nusantara-erp/domain-master-data';
import { sql } from 'drizzle-orm';

const tz = (name: string) => timestamp(name, { withTimezone: true });
const pk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7());
const money = (name: string) => numeric(name, { precision: 19, scale: 4 });
const std = {
  rowVersion: integer('row_version').default(1).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: tz('deleted_at'),
};
const tenantFk = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id);

export const batchLots = pgTable(
  'batch_lots',
  {
    id: pk(),
    tenantId: tenantFk(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    batchNo: varchar('batch_no').notNull(),
    quantity: money('quantity').default('0').notNull(),
    unitCost: money('unit_cost').default('0').notNull(),
    manufacturedAt: tz('manufactured_at'),
    expiresAt: tz('expires_at'),
    ...std,
  },
  (t) => [
    uniqueIndex('batch_lots_tenant_no_uidx')
      .on(t.tenantId, t.batchNo)
      .where(isNull(t.deletedAt)),
  ],
);

export const serialNumbers = pgTable(
  'serial_numbers',
  {
    id: pk(),
    tenantId: tenantFk(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    serialNo: varchar('serial_no').notNull(),
    status: varchar('status').default('active').notNull(),
    location: varchar('location'),
    ...std,
  },
  (t) => [
    uniqueIndex('serial_numbers_tenant_no_uidx')
      .on(t.tenantId, t.serialNo)
      .where(isNull(t.deletedAt)),
  ],
);

export const stockBalances = pgTable(
  'stock_balances',
  {
    id: pk(),
    tenantId: tenantFk(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    quantity: money('quantity').default('0').notNull(),
    unitCost: money('unit_cost').default('0').notNull(),
    valuedCost: money('valued_cost').default('0').notNull(),
    location: varchar('location'),
    recordedAt: tz('recorded_at').defaultNow().notNull(),
    ...std,
  },
  (t) => [
    uniqueIndex('stock_balances_tenant_item_wh_uidx')
      .on(t.tenantId, t.itemId, t.warehouseId)
      .where(isNull(t.deletedAt)),
  ],
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .notNull()
      .$defaultFn(() => uuidv7()),
    tenantId: tenantFk(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    fromWarehouseId: uuid('from_warehouse_id').references(() => warehouses.id),
    toWarehouseId: uuid('to_warehouse_id').references(() => warehouses.id),
    batchLotId: uuid('batch_lot_id').references(() => batchLots.id),
    serialNumber: varchar('serial_number'),
    movementType: varchar('movement_type').notNull(),
    quantity: money('quantity').notNull(),
    unitCost: money('unit_cost'),
    referenceType: varchar('reference_type'),
    referenceId: uuid('reference_id'),
    movementAt: tz('movement_at').defaultNow().notNull(),
    ...std,
  },
  (t) => [primaryKey({ columns: [t.id, t.movementAt] })],
);

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: pk(),
    tenantId: tenantFk(),
    sourceWarehouseId: uuid('source_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    targetWarehouseId: uuid('target_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    transferNo: varchar('transfer_no').notNull(),
    status: varchar('status').default('pending').notNull(),
    completedAt: tz('completed_at'),
    approvedAt: tz('approved_at'),
    ...std,
  },
  (t) => [
    uniqueIndex('stock_transfers_tenant_no_uidx')
      .on(t.tenantId, t.transferNo)
      .where(isNull(t.deletedAt)),
  ],
);

export const stockOpnames = pgTable(
  'stock_opnames',
  {
    id: pk(),
    tenantId: tenantFk(),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    opnameNo: varchar('opname_no').notNull(),
    status: varchar('status').default('pending').notNull(),
    countedAt: tz('counted_at'),
    approvedAt: tz('approved_at'),
    ...std,
  },
  (t) => [
    uniqueIndex('stock_opnames_tenant_no_uidx')
      .on(t.tenantId, t.opnameNo)
      .where(isNull(t.deletedAt)),
  ],
);
