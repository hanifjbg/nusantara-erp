// Skema master item: UoM, konversi, kategori, items, varian, price lists
// (rujukan: docs/schema_nusantara.json).
// price_list_items tanpa tenant_id (scope via parent price_lists — aturan skill #4).
import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { tenants, uuidv7 } from '@nusantara-erp/domain-identity';
import { organizations } from '@nusantara-erp/domain-org';
import { currencies } from './finance';

const tz = (name: string) => timestamp(name, { withTimezone: true });
const pk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7());

export const unitsOfMeasure = pgTable(
  'units_of_measure',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    uomCode: varchar('uom_code').notNull(),
    uomName: varchar('uom_name').notNull(),
    uomCategory: varchar('uom_category'),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('uom_tenant_code_uidx').on(t.tenantId, t.uomCode).where(isNull(t.deletedAt)),
  ],
);

export const uomConversions = pgTable(
  'uom_conversions',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    fromUomId: uuid('from_uom_id')
      .notNull()
      .references(() => unitsOfMeasure.id),
    toUomId: uuid('to_uom_id')
      .notNull()
      .references(() => unitsOfMeasure.id),
    conversionFactor: numeric('conversion_factor').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    uniqueIndex('uom_conv_uidx')
      .on(t.tenantId, t.fromUomId, t.toUomId)
      .where(isNull(t.deletedAt)),
  ],
);

export const itemCategories = pgTable(
  'item_categories',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    parentCategoryId: uuid('parent_category_id'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    categoryCode: varchar('category_code').notNull(),
    categoryName: varchar('category_name').notNull(),
  },
  (t) => [
    uniqueIndex('item_cat_tenant_code_uidx')
      .on(t.tenantId, t.categoryCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const items = pgTable(
  'items',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    itemCategoryId: uuid('item_category_id').references(() => itemCategories.id),
    uomId: uuid('uom_id').references(() => unitsOfMeasure.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    itemCode: varchar('item_code').notNull(),
    itemName: varchar('item_name').notNull(),
    description: text('description'),
    barcode: varchar('barcode'),
    brand: varchar('brand'),
  },
  (t) => [
    uniqueIndex('items_tenant_code_uidx').on(t.tenantId, t.itemCode).where(isNull(t.deletedAt)),
  ],
);

export const itemVariants = pgTable(
  'item_variants',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    additionalPrice: numeric('additional_price').default('0').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    variantCode: varchar('variant_code').notNull(),
    variantName: varchar('variant_name').notNull(),
  },
  (t) => [
    uniqueIndex('item_var_item_code_uidx')
      .on(t.itemId, t.variantCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const priceLists = pgTable(
  'price_lists',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    currencyId: uuid('currency_id').references(() => currencies.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    priceListName: varchar('price_list_name').notNull(),
  },
  (t) => [
    uniqueIndex('price_lists_tenant_name_uidx')
      .on(t.tenantId, t.priceListName)
      .where(isNull(t.deletedAt)),
  ],
);

export const priceListItems = pgTable(
  'price_list_items',
  {
    id: pk(),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    unitPrice: numeric('unit_price').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
  },
  (t) => [
    uniqueIndex('price_list_items_uidx')
      .on(t.priceListId, t.itemId)
      .where(isNull(t.deletedAt)),
  ],
);
