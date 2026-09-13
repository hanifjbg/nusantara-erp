// Fase 0 — koneksi Drizzle via pooler-friendly driver `postgres`.
// Catatan deploy (00-architecture.md): di Vercel wajib Supavisor :6543 + `prepare: false`.
// Lokal (primer): konek langsung ke Postgres 127.0.0.1:5432.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
export type Db = typeof db;
