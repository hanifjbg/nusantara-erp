// Setup vitest apps/api: env dummy agar import env.ts/db client tidak throw.
// Integration test (*.int.spec.ts) memakai DATABASE_URL asli dari environment.
process.env.DATABASE_URL ??= 'postgresql://127.0.0.1:5432/nusantara_vitest_dummy';
process.env.JWT_SECRET ??= 'vitest-dummy-secret-min-32-karakter-x';
