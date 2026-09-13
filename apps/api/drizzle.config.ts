// Fase 0 — Drizzle Kit config. URL dibaca dari env (jangan hardcode kredensial).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // drizzle-kit membaca process.env.DATABASE_URL saat CLI jalan
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? '',
  },
});
