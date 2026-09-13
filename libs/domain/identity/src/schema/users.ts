// Skema users + sessions + login_histories (rujukan: docs/schema_nusantara.json).
// users tenant-scoped (multi-tenant); sessions/login_histories user-scoped
// (tenant diturunkan via users — skill tenant-isolation aturan 4).
import {
  boolean,
  date,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { uuidv7 } from '../uuid';
import { tenants } from './tenants';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    birthDate: date('birth_date'),
    addressId: uuid('address_id'),
    mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
    lastLoginAt: tz('last_login_at'),
    createdAt: tz('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    username: varchar('username'),
    email: varchar('email').notNull(),
    passwordHash: varchar('password_hash').notNull(),
    firstName: varchar('first_name'),
    lastName: varchar('last_name'),
    fullName: varchar('full_name'),
    phone: varchar('phone'),
    whatsappNumber: varchar('whatsapp_number'),
    gender: varchar('gender'),
    birthPlace: varchar('birth_place'),
    nik: varchar('nik'),
    avatarUrl: text('avatar_url'),
    status: varchar('status').default('active').notNull(),
  },
  (t) => [
    uniqueIndex('users_email_uidx').on(t.email).where(isNull(t.deletedAt)),
    uniqueIndex('users_username_uidx').on(t.username).where(isNull(t.deletedAt)),
  ],
);

/** Refresh-token session (rotation): hanya hash yang disimpan, bukan token mentah. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    ipAddress: inet('ip_address'),
    expiresAt: tz('expires_at').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    tokenHash: varchar('token_hash').notNull(),
    userAgent: text('user_agent'),
    deviceInfo: text('device_info'),
  },
  (t) => [uniqueIndex('sessions_token_hash_uidx').on(t.tokenHash)],
);

export const loginHistories = pgTable('login_histories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7()),
  userId: uuid('user_id').references(() => users.id),
  ipAddress: inet('ip_address'),
  loginAt: tz('login_at').defaultNow().notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: tz('deleted_at'),
  userAgent: text('user_agent'),
  deviceInfo: text('device_info'),
  status: varchar('status').notNull(),
  failureReason: varchar('failure_reason'),
});
