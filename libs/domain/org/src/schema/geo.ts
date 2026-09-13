// Skema wilayah Indonesia + addresses (rujukan: docs/schema_nusantara.json).
// countries→provinces→cities→districts→sub_districts = referensi GLOBAL (tanpa tenant_id).
// addresses tenant-scoped.
import {
  boolean,
  char,
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

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    isoCode: char('iso_code', { length: 2 }).notNull(),
    countryName: varchar('country_name').notNull(),
    phoneCode: varchar('phone_code'),
  },
  (t) => [
    uniqueIndex('countries_iso_uidx').on(t.isoCode).where(isNull(t.deletedAt)),
  ],
);

export const provinces = pgTable(
  'provinces',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    countryId: uuid('country_id')
      .notNull()
      .references(() => countries.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    wilayahCode: varchar('wilayah_code').notNull(),
    provinceName: varchar('province_name').notNull(),
  },
  (t) => [
    uniqueIndex('provinces_wilayah_uidx')
      .on(t.wilayahCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    provinceId: uuid('province_id')
      .notNull()
      .references(() => provinces.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    wilayahCode: varchar('wilayah_code').notNull(),
    cityName: varchar('city_name').notNull(),
    cityType: varchar('city_type'),
  },
  (t) => [
    uniqueIndex('cities_wilayah_uidx').on(t.wilayahCode).where(isNull(t.deletedAt)),
  ],
);

export const districts = pgTable(
  'districts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    wilayahCode: varchar('wilayah_code').notNull(),
    districtName: varchar('district_name').notNull(),
  },
  (t) => [
    uniqueIndex('districts_wilayah_uidx')
      .on(t.wilayahCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const subDistricts = pgTable(
  'sub_districts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    districtId: uuid('district_id')
      .notNull()
      .references(() => districts.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    wilayahCode: varchar('wilayah_code').notNull(),
    subDistrictName: varchar('sub_district_name').notNull(),
    postalCode: varchar('postal_code'),
  },
  (t) => [
    uniqueIndex('sub_districts_wilayah_uidx')
      .on(t.wilayahCode)
      .where(isNull(t.deletedAt)),
  ],
);

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provinceId: uuid('province_id').references(() => provinces.id),
  cityId: uuid('city_id').references(() => cities.id),
  districtId: uuid('district_id').references(() => districts.id),
  subDistrictId: uuid('sub_district_id').references(() => subDistricts.id),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  deletedAt: tz('deleted_at'),
  rowVersion: integer('row_version').default(1).notNull(),
  postalCode: varchar('postal_code'),
  label: varchar('label'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
});
