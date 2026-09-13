// Skema master partner: customers (+contacts, +addresses) & vendors (+contacts)
// (rujukan: docs/schema_nusantara.json).
// vendors.bank_id menunjuk bank Fase 7 — tanpa .references() (tanpa forward dep).
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

export const customers = pgTable(
  'customers',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    addressId: uuid('address_id').references(() => addresses.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    customerCode: varchar('customer_code').notNull(),
    customerName: varchar('customer_name').notNull(),
    npwp: varchar('npwp'),
    contactPerson: varchar('contact_person'),
    phone: varchar('phone'),
    email: varchar('email'),
    website: varchar('website'),
    customerType: varchar('customer_type'),
    status: varchar('status').default('active').notNull(),
  },
  (t) => [
    uniqueIndex('customers_tenant_code_uidx')
      .on(t.tenantId, t.customerCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const customerContacts = pgTable(
  'customer_contacts',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    contactName: varchar('contact_name').notNull(),
    position: varchar('position'),
    phone: varchar('phone'),
    email: varchar('email'),
  },
);

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    addressId: uuid('address_id')
      .notNull()
      .references(() => addresses.id),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
  },
);

export const vendors = pgTable(
  'vendors',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    organizationId: uuid('organization_id').references(() => organizations.id),
    addressId: uuid('address_id').references(() => addresses.id),
    bankId: uuid('bank_id'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    vendorCode: varchar('vendor_code').notNull(),
    vendorName: varchar('vendor_name').notNull(),
    npwp: varchar('npwp'),
    contactPerson: varchar('contact_person'),
    phone: varchar('phone'),
    email: varchar('email'),
    website: varchar('website'),
    bankAccountNumber: varchar('bank_account_number'),
    status: varchar('status').default('active').notNull(),
  },
  (t) => [
    uniqueIndex('vendors_tenant_code_uidx')
      .on(t.tenantId, t.vendorCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const vendorContacts = pgTable(
  'vendor_contacts',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    contactName: varchar('contact_name').notNull(),
    position: varchar('position'),
    phone: varchar('phone'),
    email: varchar('email'),
  },
);
