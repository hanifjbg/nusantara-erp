// Fase 0 — env bertipe untuk apps/api (AGENTS.md: tidak ada process.env.X tersebar bebas).
// Semua akses env backend wajib lewat `env` ini. Gagal fast saat startup bila invalid.
import { z } from 'zod';

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi (lihat .env.example)'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter').default('dev-only-jwt-secret-min-32-karakter-123'),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().int().positive().default(604800),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

function loadApiEnv(): ApiEnv {
  return apiEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    API_PORT: process.env.API_PORT,
    DATABASE_URL: process.env.DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  });
}

export const env: ApiEnv = loadApiEnv();
