# 00 — Arsitektur

Sumber otoritatif: `docs/nusantara-erp-blueprint.md` Bagian 1 & 2. Dokumen ini ringkasan operasional yang dipakai semua agent.

## 1. Stack (keputusan final)
| Area | Keputusan | Catatan |
|---|---|---|
| Monorepo | **Nx** | tags `domain:*` + `enforce-module-boundaries`; `nx affected` |
| Backend | **NestJS modular monolith** (`apps/api`) | bukan microservices (infra gratis) |
| Frontend | **Next.js 16 + React + Tailwind v4** (`apps/web`) | |
| DB & Cache | **Postgres 18** (container docker-compose) + **Redis** (BullMQ lokal) | |
| ORM/Migration | **Drizzle ORM + Drizzle Kit** | baseline dari `introspect`, migration incremental |
| Auth | **NestJS custom (Passport/JWT)** | skema RBAC granular sendiri; bukan Supabase Auth |
| API Contract | **REST + OpenAPI (Swagger)** → generate client TS | `openapi.json` di-diff |
| Package manager | **pnpm** (satu-satunya) | |
| Test runner | **Vitest** via `@nx/vite` | hemat RAM untuk budget 8GB |
| Validasi | **Zod** di `libs/shared` | nestjs-zod (BE) + react-hook-form/zod (FE) |
| i18n | **next-intl** di apps/web (id/en) | disiapkan Fase 0 |
| Deploy | Next + Nest → **Vercel serverless** | pooler Supavisor :6543 transaksi, `prepare:false` |

## 2. Konvensi DB
- PK `UUID v7`; kolom standar: `id, tenant_id, created_at, created_by, updated_at, updated_by, deleted_at, row_version`.
- Multi-tenant: shared schema + `tenant_id` tiap tabel + RLS. Soft delete = partial unique index `WHERE deleted_at IS NULL`.
- Monetary `DECIMAL(19,4)`. JSONB untuk semi-terstruktur.
- Partisi: `audit_logs` & `stock_movements` RANGE bulanan (`*_p*`), idempotent, job auto partisi bulan depan (infra DevOps Fase 0, domain `platform` Fase 21).

## 3. Job & Queue (lokal vs Vercel)
- **Lokal**: Redis + BullMQ worker persisten (docker-compose). Full fidelity.
- **Vercel**: **Upstash QStash** scheduler HTTP-callback (bukan Vercel Cron utk job non-harian; Vercel Cron hanya 1×/hari utk task harian). Upstash Redis hanya cache.
- **Satu logic, dua pemicu**: business logic = fungsi polos; worker lokal & endpoint QStash manggil fungsi yang sama.
- **Jebakan DB serverless**: wajib pooler `Supavisor :6543 transaction mode` + `prepare: false` — bukan koneksi langsung lokal.
- Opsi cadangan: ganti Express adapter ke Fastify bila cold-start membengkak (belum diputuskan).

## 4. Migrasi DB existing (Fase 0 — Bagian 2.2)
1. `SELECT version();` instance existing vs target Postgres 18.
2. Dump `pg_dump --format=plain --no-owner --no-privileges` (portable, BUKAN custom).
3. `docker-compose.yml` (Postgres 18 + Redis). Restore dump ke container.
4. `drizzle-kit introspect --url="<container url>"` → **baseline**.
5. Instance lama `agent_dev` → backup/rujukan. **Satu sumber kebenaran = container**.
6. Backup rutin: dump terjadwal sebelum tiap migration run.

Larangan: `DROP DATABASE`/`TRUNCATE`/`drizzle-kit push --force` tanpa dump + izin manusia. Kredensial di `.env.local` (gitignored) → baca via `env.ts` (Zod) — tidak di hardcode/template ter-commit.

## 5. Env & Secrets
- Tiap app punya `env.ts` tipe-Zod (apps/api, apps/web) — tidak ada `process.env.X` di tempat lain.
- `.env.local` gitignored berisi nilai; sediakan `.env.example` tanpa nilai rahasia.

## 6. Struktur Folder
```
apps/api · apps/web
libs/shared/* · libs/shared/ui
libs/domain/{identity,org,master-data,workflow,inventory,sales-crm,procurement,finance,pos,manufacturing,hr-core,payroll-id,recruitment-training,fixed-assets,project,field-service,logistics,marketplace,support,document-legal,platform}
```
Mapping domain → fase ada di `roadmap.md`. Setiap lib ber-tag `domain:<name>`; cross-lib hanya via `index.ts`.

## 7. Design System (Bagian 3.1)
- Primitive layer **Base UI** (default shadcn init 2026), bukan Radix.
- Tokens: Tailwind v4 `@theme` + `components.json`, satu sumber.
- Atoms/molecules generik → `libs/shared/ui` (hasil `shadcn add` via MCP). Organisms/templates domain → lib domain.
- MCP `shadcn-ui` (`--ui-library base`) wajib dipakai Executor FE — jangan mengarang API komponen.