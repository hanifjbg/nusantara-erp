# NUSANTARA ERP — Project Guide (untuk semua AI agents)

> Enterprise SaaS ERP Multi-Tenant · PostgreSQL 18 · Next.js 16 · NestJS modular monolith · Drizzle · Nx · pnpm · Tailwind v4 · Base UI
> Workspace: `/media/hanifjbg/data/webdev/nusantara-erp` · Repo: `github.com/hanifjbg/nusantara-erp` (public)

## Sesi Baru (WAJIB baca dulu, urut)
1. `docs/README.md` — index seluruh dokumentasi & cara baca.
2. `docs/00-architecture.md` — keputusan arsitektur (DB, API, job/queue, env, deploy).
3. `docs/roadmap.md` — 21 fase + status progres.
4. `docs/01..docs/21` — fase yang sedang dikerjakan.
5. `AGENTS.md` ini — aturan wajib.
6. Spreadsheet/`schema_nusantara.json` untuk spesifikasi tabel (rujukan Validator).

## Prinsip Kerja (non-negotiable)
1. **Bangun bertahap per fase** (0–21). Jangan generate 215 tabel sekaligus. Satu fase = satu siklus review sebelum lanjut.
2. **Pagar monorepo**: akses domain lain **wajib lewat public API `index.ts`** — `enforce-module-boundaries` (Nx tags `domain:<name>`) harus lolos. Tidak ada import file internal antar lib.
3. **Design system**: komponen baru wajib pakai `libs/shared/ui` yang sudah ada (hasil `shadcn add` via MCP, Base UI). Bersihkan/komposisi ulang daripada duplikasi.
4. **Tidak ada `process.env.X`** tersebar bebas — semua lewat `env.ts` bertipe (Zod) per app.
5. **DB**: setiap query pada tabel ber-`tenant_id` wajib difilter tenant. RLS aktif di database.
6. **Verifikasi nyata**, bukan klaim: build/typecheck/lint/test dijalankan, DB dicek via psql/MCP, UI diuji interaksi nyata.
7. **Tidak ada `DROP DATABASE`, `TRUNCATE`, atau `drizzle-kit push --force`** ke database dev tanpa (a) dump terbaru tersedia dan (b) persetujuan eksplisit manusia. Berlaku sejak Fase 0.

## Stack & Konvensi (TAATI)
| Area | Keputusan |
|---|---|
| Monorepo | Nx (tags `domain:*`, `nx affected` untuk scope kerja) |
| Package manager | **pnpm saja** — jangan campur bun/npm/yarn |
| Backend | NestJS modular monolith (`apps/api`) — semua domain sbg Nest module |
| Frontend | Next.js 16 + React + Tailwind v4 (`apps/web`) |
| DB & Cache | Postgres 18 (container docker-compose) + Redis (BullMQ lokal) |
| ORM/Migration | **Drizzle ORM + Drizzle Kit**. Baseline dari `drizzle-kit introspect` (Bagian 2.2) — bukan tulis CREATE TABLE dari nol |
| Kontrak API | REST + OpenAPI (NestJS Swagger) → generate client TS. `openapi.json` di-diff |
| Test | **Vitest** via `@nx/vite` (bukan Jest — hemat RAM) |
| Validasi schema | Zod di `libs/shared` (nestjs-zod backend, react-hook-form + zod resolver frontend) |
| i18n | `next-intl` di `apps/web`, locale id/en sudah dari Fase 0 |
| Deploy | Next + NestJS → Vercel serverless; DB wajib lewat connection pooler (Supavisor :6543, `prepare: false`); job non-harian → Upstash QStash |
| Tipe monetary | `DECIMAL(19,4)` | Kolom standar | `id`, `tenant_id`, `created_at/by`, `updated_at/by`, `deleted_at`, `row_version` — semua tabel |
| Primary key | UUID v7 | Multi-tenancy | shared schema + `tenant_id` tiap tabel + RLS |
| Soft delete | partial unique index `WHERE deleted_at IS NULL` | Partisi | `audit_logs*`, `stock_movements*` (bulanan, idempotent, auto-buat partisi bulan depan) |

## Arsitektur Job/Queue (lokal vs Vercel — Bagian 2.1 blueprint)
- **Lokal**: Redis + BullMQ, worker proses persisten di docker-compose — full fidelity.
- **Vercel**: **Upstash QStash** (HTTP callback ke API route) sebagai scheduler job non-harian; **Upstash Redis** hanya untuk cache. Vercel Cron native boleh untuk task harian (1×/hari).
- **Satu logic, dua pemicu**: business logic = fungsi/service polos; worker lokal & endpoint QStash sama-sama manggil fungsi itu. Boleh Fastify adapter bila cold-start Nest di serverless membengkak (catat saja, belum diputuskan).

## DB Existing — Aturan Migrasi (Fase 0, Bagian 2.2)
- Sumber existing: `schema_nusantara.json` hasil export instance Postgres **masih hidup di mesin** (mulanya `agent_dev`, 215 tabel fisik + sedikit data uji). Bukan spesifikasi kertas; **jangan asumsikan DB kosong**.
- Alur: cek `SELECT version();` → `pg_dump --format=plain --no-owner --no-privileges` (portable lintas versi, bukan custom) → buat `docker-compose.yml` (Postgres 18 + Redis) → restore ke container → `drizzle-kit introspect` → baseline = titik awal migration incremental.
- Setelah restore, instance lama hanya **backup/rujukan**. Semua kerja jalan di container docker-compose = **satu sumber kebenaran**.
- Kredensial: `.env.local` (gitignored), baca via `env.ts`, bukan hardcode/template yang ter-commit.
- **Backup rutin** sejak Fase 0: `pg_dump` terjadwal sebelum tiap migration run.

## Struktur Folder
```
apps/api   apps/web
libs/shared/*, libs/shared/ui
libs/domain/{identity,org,master-data,workflow,inventory,sales-crm,procurement,finance,pos,manufacturing,hr-core,payroll-id,recruitment-training,fixed-assets,project,field-service,logistics,marketplace,support,document-legal,platform}
.opencode/agent (persona) · .opencode/skills (aturan) · .opencode/opencode.json
docs/ (00-architecture, roadmap, fase-XX-*.md per fase, skill referensi)
```

## Git Workflow Multi-Agent (Bagian 5.4 blueprint)
- Tiap task Executor di **branch sendiri**: `agent/fase-XX-<domain>/<modul>` — tidak pernah commit langsung ke `main`.
- **Manusia yang merge PR** setelah Validator + Security + QA hijau — bukan agent. Agent TIDAK auto-merge.
- Satu branch = satu slice kerja → review per PR fokus. Jangan force-push / hapus main.
- Commit: Conventional Commits, satu task = satu commit.
- Jangan commit: `.env*`, hasil build, `artifacts/`.

## Pipeline Kerja per Modul (Bagian 5.1)
1. **Architect** (ringan) → rancang migration incremental + kontrak OpenAPI + pemetaan Nx lib.
2. **Executor** (berat) → implementasi (migration Drizzle, entity, service, controller, DTO, komponen Next via MCP shadcn).
3. **Tester** (berat) → unit/integration test Vitest.
4. **Validator** (ringan) → cocokkan vs `schema_nusantara.json` + `openapi.json` + `nx lint` boundary.
5. **Security** (ringan) → isolasi tenant, secrets, RBAC, validasi input.
6. **QA** (ringan) → logika bisnis vs roadmap, edge case, (Fase 11: PPh21/BPJS ke sumber resmi).
7. **Merge manual** oleh manusia.

**Budget paralel (8GB/4-core)**: baseline lokal ~1.5–2GB. Maks **1 agent berat** aktif di awal (stabil → boleh 2, dicoba bertahap). Agent ringan boleh 2–3 paralel. Pipeline per modul **staggered**: Architect modul B jalan saat Executor masih di modul A.

## Persona & Model (Bagian 5.2–5.3)
- Persona: `Architect`, `Executor`, `Tester`, `Validator`, `Security`, `QA`, `DevOps` — detail di `.opencode/agent/*.md`.
- Model routing: **jangan hardcode nama model Zen free** (rotasi cepat). Cek saat setup (`opencode models`). Prioritas: Architect/Validator/Security/QA → kanal reasoning ringan (Antigravity/Zen); Executor/Tester → Zen lokal. Lihat `docs/99-orchestration.md`.

## Definition of Done — wajib terpenuhi sebelum "done"
1. Lint + typecheck + build lulus (dieksekusi, bukan diklaim). Unit/integration test untuk logika non-trivial.
2. DB diverifikasi nyata (psql/MCP): constraint/RLS/tenant filter benar, migration idempotent.
3. UI berfungsi nyata (interaksi, bukan halaman terbuka). Komponen pakai `shared/ui`.
4. Docs roadmap fase di-update + commit terpisah per task; `main` hijau.
5. Tanpa interpolasi string ke SQL, tanpa secret di log/repo, env tidak bocor ke client.

## Referensi Skill (`.opencode/skills/`)
- `nx-*` (bawaan Nx), `shadcn-base` (desain system), `tenant-isolation-rules`, `nx-module-boundaries`, `payroll-id-rules`, `partitioned-table-migration`. Baca skill relevan sebelum kerja.