# Fase 00 — Scaffolding

> **Goal**: Fondasi teknis workspace sebelum domain code. Semua requirements di sini harus hijau sebelum fase lain.
> **Deliverer**: DevOps + Architect (Design System Foundation). Tidak ada tabel domain di fase ini.

## Deliverable
1. Repo Nx (pnpm) ter-inits kekas ~ `apps/api`, `apps/web`, `libs/shared/*`, `libs/domain/*` ber-tag `domain:*`.
2. `docker-compose.yml`: Postgres 18 + Redis (untuk BullMQ lokal).
3. Baseline Drizzle: migrasi DB existing (Bagian 2.2) → `drizzle-kit introspect` → baseline schema.
4. `env.ts` bertipe (Zod) untuk apps/api & apps/web; `.env.example`; `.env.local` (gitignored).
5. Design System Foundation (Architect): Base UI primitives di `libs/shared/ui`, design token Tailwind v4 `@theme`, MCP shadcn.
6. i18n `next-intl` (id/en) di apps/web.
7. Nx Cloud connect (Hobby, remote cache).
8. CI GitHub Actions: lint + typecheck + build + test (Vitest) on push.
9. AGENTS.md, docs roadmap & spec fase ini, `.opencode/{agent,skills}` persona.
10. Nx tags + `enforce-module-boundaries` terpasang.

## Acceptance criteria
- [x] `npx nx run-many -t typecheck lint build` green (web + ui libs).
- [x] `pnpm exec drizzle-kit introspect` menghasilkan baseline tanpa error.
- [x] Partisi infra (`create_next_month_partition` pola) disiapkan DevOps.
- [x] CI run on push: 0 error.
- [x] git: branch pattern `agent/fase-00/*` diikuti, main hijau.

## Dependensi
- Blueprint Bagian 2.2 (dump/restore/introspect). Instance `agent_dev` → backup setelah baseline.

## Skill terkait
`nx-*`, `shadcn-base`, `partitioned-table-migration`, `tenant-isolation-rules`, `nx-module-boundaries`.