// Fase 0 — env bertipe untuk apps/web (AGENTS.md: tidak ada process.env.X tersebar bebas).
// Semua akses env web wajib lewat `env` ini.
import { z } from 'zod';

const webEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['id', 'en']).default('id'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

function loadWebEnv(): WebEnv {
  return webEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });
}

export const env: WebEnv = loadWebEnv();
