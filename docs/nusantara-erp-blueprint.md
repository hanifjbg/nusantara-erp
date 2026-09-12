# Nusantara ERP — Blueprint & Multi-Agent Setup Plan

> Dokumen ini adalah **spesifikasi untuk AI setup agent** (dijalankan lewat OpenCode/Antigravity di
> `/media/hanifjbg/data/webdev/nusantara-erp`). Tugas setup agent: baca dokumen ini, lalu eksekusi
> Bagian 8 (instruksi konkret) untuk membangun struktur repo, file aturan, dan konfigurasi multi-agent
> — bukan untuk langsung menulis 215 tabel sekaligus.

---

## 1. Ringkasan Proyek

- **Nama**: nusantara-erp — ERP hobi, 100% gratis, dev lokal, staging di Vercel + Supabase.
- **Skala database**: 215 tabel, 21 domain bisnis (lihat Bagian 4). Setara ERP kelas menengah
  (Odoo/SAP B1), bukan aplikasi CRUD kecil. **Wajib dibangun bertahap per fase**, tidak sekaligus.
- **Repo**: `github.com/hanifjbg/nusantara-erp.git`
- **Hardware dev**: 8GB RAM / 4-core → ini membatasi berapa banyak agent yang boleh jalan
  benar-benar paralel (lihat Bagian 5.1). Jangan asumsikan mesin kuat menjalankan >2 proses
  build/test berat bersamaan.

## 2. Keputusan Arsitektur

| Area | Keputusan | Alasan |
|---|---|---|
| Monorepo | **Nx** | `module boundary` (tags) bisa memblokir agent yang bikin modul saling coupling salah — krusial saat eksekusinya AI agent otonom, bukan manusia yang selalu review. Plus `nx affected` biar agent paralel cuma menyentuh scope-nya. |
| Backend | **NestJS — modular monolith**, bukan microservices | 21 domain jadi microservices beneran = overhead deploy/orkestrasi besar, tidak cocok infra gratis. Modular monolith + Nx boundaries = disiplin yang sama tanpa ongkos operasional. |
| Frontend | Next.js 16 + React + Tailwind v4 | sesuai permintaan |
| DB & Cache | Postgres 18 (kompatibel Supabase), Redis (cache/queue, misal BullMQ untuk job seperti `scheduled_jobs`, `import_jobs`) | sesuai environment yang sudah ada |
| ORM/Migration | **Drizzle ORM + Drizzle Kit** (asumsi, bisa diganti). **Baseline schema digenerate lewat `drizzle-kit introspect` dari DB existing** (lihat Bagian 2.2) — bukan ditulis dari nol | Schema kamu punya *partitioned table* (`audit_logs_p*`, `stock_movements_p*`) yang tidak didukung baik oleh ORM high-level (Prisma kesulitan di sini). Drizzle lebih dekat ke SQL mentah, ringan untuk cold-start di Vercel serverless, dan cocok untuk raw migration partition. Kalau kamu lebih nyaman Prisma/TypeORM, bisa diganti — cukup beri tahu setup agent. |
| Auth | **NestJS custom (Passport/JWT)**, bukan Supabase Auth | Skema punya RBAC granular sendiri (`permissions`, `role_permissions`, `user_organizations` multi-org) — lebih natural dipegang backend Nest daripada dipaksa muat ke model user Supabase Auth yang lebih sederhana. |
| Kontrak API (Next.js ↔ Nest) | **REST + OpenAPI (NestJS Swagger) + generate client TS**, bukan tRPC | `openapi.json` jadi artifact yang bisa di-diff: Architect nulis kontrak, Executor implementasi, Validator cocokkan spec vs realisasi. tRPC lebih implisit, susah diverifikasi otomatis oleh agent. |
| Package Manager | **pnpm**, satu-satunya di seluruh workspace | Multi-agent yang install dependency bersamaan pakai PM beda-beda = lockfile konflik/corrupt. Paling hemat disk untuk monorepo. |
| Test Runner | **Vitest** (via `@nx/vite`), bukan Jest | Nyambung ke budget konkurensi 8GB RAM — Vitest jauh lebih ringan jadi Tester agent tidak terlalu makan resource saat jalan paralel. |
| Validasi Schema | **Zod** di `libs/shared`, dipakai dobel: `nestjs-zod` di backend, `react-hook-form` + zod resolver di frontend | Satu sumber kebenaran untuk validasi, nyambung ke `drizzle-zod` dari schema Drizzle yang sudah ada. |
| Env & Secrets | Satu `env.ts` bertipe (validasi Zod) per app, bukan `process.env.X` tersebar bebas | Biar agent tidak asal menebak nama variabel env; error tampak saat startup, bukan runtime. |
| i18n | **next-intl** (atau setara), disiapkan dari **Fase 0** | Keputusan bisnis: UI perlu multi-bahasa (Indonesia + Inggris) sejak awal, bukan ditambah belakangan — lebih murah disiapkan di awal daripada retrofit setelah ratusan layar dibangun. |
| Deploy | Next.js **dan** NestJS API sama-sama di **Vercel serverless**. Job/queue (`scheduled_jobs`, BullMQ) **tidak bisa dipindah apa adanya** karena Vercel Hobby cron cuma boleh jalan 1×/hari — lihat mekanisme penggantinya di **Bagian 2.1**. Koneksi Postgres dari serverless wajib lewat connection pooler (Supabase Supavisor, port 6543, transaction mode; Drizzle di-set `prepare: false`), bukan koneksi langsung seperti di lokal. |

### 2.1 Arsitektur Job & Queue (Lokal vs Vercel Deploy)

Karena backend dideploy ke Vercel serverless (Bagian 2), mekanisme trigger job **wajib dibedakan**
antara lokal dan Vercel — bukan sekadar "adjust dikit":

- **Lokal**: tetap Redis + BullMQ dengan worker proses persisten (docker-compose) — full-fidelity,
  agent bisa test job logic apa adanya.
- **Vercel (test/demo)**: pakai **Upstash QStash** (gratis, berbasis HTTP callback ke API route,
  mendukung jadwal per-menit & delay — tidak kena limit cron Vercel karena dia scheduler eksternal).
  **Upstash Redis** (REST-compatible) di sini cuma dipakai untuk cache, bukan backing queue.
- **Satu logic, dua pemicu**: business logic job ditulis sebagai fungsi/service polos yang terpisah
  dari cara dia dipicu — worker BullMQ lokal manggil fungsi itu, endpoint yang di-hit QStash juga
  manggil fungsi yang sama. DevOps agent yang bikin dua "pemicu"-nya, Executor cukup nulis satu logic.
- Task yang cukup berjalan **harian** (misal partition check, depresiasi aset) tetap boleh pakai
  **Vercel Cron native** — gratis, simpel, sesuai limitnya (1×/hari).
- **Jebakan koneksi DB**: koneksi Postgres dari serverless function gampang jebol limit koneksi
  Supabase kalau tidak lewat connection pooler (**Supavisor, port 6543, transaction mode**) — beda
  dari koneksi langsung yang dipakai lokal. Drizzle wajib di-set `prepare: false` kalau pakai pooler
  mode transaksi ini. Ini yang perlu diwanti-wanti eksplisit ke DevOps agent.
- **Dipantau nanti (bukan keputusan sekarang)**: makin banyak modul domain numpuk (21 fase),
  cold-start NestJS di serverless bisa makin berat. Mitigasinya sudah jelas kalau dibutuhkan: ganti
  Express adapter ke **Fastify** (NestJS support native, lebih ringan) — tidak perlu diputuskan
  sekarang, cukup dicatat sebagai opsi.

### 2.2 Migrasi Database Existing ke Environment Dev Baru (Fase 0) — PENTING

**Kondisi aktual (dikonfirmasi manual, bukan asumsi)**: `schema_nusantara.json` adalah hasil *export*
dari instance Postgres yang **masih hidup di mesin lokal ini**, bukan sekadar spesifikasi desain di
atas kertas. Isinya sudah 215 tabel fisik, dengan sedikit data uji coba di beberapa tabel (bukan data
produksi). Ini **wajib** dipagari secara eksplisit di Fase 0, karena kalau tidak, agent setup akan
default berasumsi DB kosong dan menulis migration dari nol — berpotensi bentrok, duplikat, atau
(paling buruk) menjalankan perintah destruktif ke instance yang sudah ada.

**Aturan wajib untuk DevOps/Executor agent:**

1. **Cek dulu versi Postgres instance existing** (`SELECT version();`) vs target **Postgres 18** di
   Bagian 2. Kalau beda versi, dump wajib pakai format **plain SQL**
   (`pg_dump --format=plain --no-owner --no-privileges`) supaya portable lintas versi, bukan format
   `custom` yang versi-sensitif.
2. **Migrasi satu kali di Fase 0**: dump schema + data dari instance existing → restore ke container
   Postgres di `docker-compose.yml` yang baru. Setelah ini, instance lama diperlakukan sebagai
   **backup/rujukan saja** — semua kerja Executor/agent selanjutnya jalan di container docker-compose,
   supaya cuma ada **satu sumber kebenaran** yang dipakai paralel oleh semua agent.
3. Setelah restore ke container baru, jalankan **`drizzle-kit introspect`** untuk generate baseline
   schema Drizzle dari DB yang sudah ada — ini jadi **titik awal (baseline)**, bukan Architect menulis
   ulang 215 `CREATE TABLE` dari nol untuk Fase 1. Migration per fase (1–21) selanjutnya adalah
   **incremental diff** di atas baseline ini, dicocokkan Validator terhadap baseline + `schema_nusantara.json`.
4. **Larangan eksplisit** (masuk juga ke Bagian 7): Executor/DevOps **dilarang** menjalankan
   `DROP DATABASE`, `TRUNCATE`, atau `drizzle-kit push --force` ke database dev tanpa (a) dump
   terbaru tersedia, dan (b) persetujuan eksplisit dari kamu — meskipun datanya "cuma" uji coba
   sekarang, aturan ini harus berlaku dari awal, bukan ditambahkan setelah ada insiden nanti saat
   data sudah beneran terisi.
5. **Backup rutin sejak Fase 0**: DevOps agent setup `pg_dump` terjadwal (cukup cron/skrip sederhana
   sebelum setiap migration run) sebagai kebiasaan baku, bukan fitur yang ditambah belakangan.

**Koneksi sumber data existing (dev lokal, sudah dikonfirmasi):**

```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=agent
POSTGRES_DB=agent_dev
```

Kredensial lengkap (termasuk password) **jangan** dihardcode di file blueprint ini atau file lain
yang ikut ke-commit — taruh di `.env.local` (gitignored), dibaca lewat `env.ts` bertipe (Bagian 2).
Contoh alur dump satu-kali di Fase 0 (DevOps agent baca URL dari env, bukan dari dokumen ini):

```bash
# 1. Cek versi Postgres existing dulu (bandingkan ke target Postgres 18)
psql "$POSTGRES_URL_NON_POOLING" -c "SELECT version();"

# 2. Dump schema + data DB agent_dev existing (format plain = portable lintas versi)
pg_dump "$POSTGRES_URL_NON_POOLING" --format=plain --no-owner --no-privileges \
  --file=nusantara-baseline-dump.sql

# 3. Restore ke container Postgres 18 baru di docker-compose (setelah container up)
psql "$DOCKER_POSTGRES_URL" -f nusantara-baseline-dump.sql

# 4. Generate baseline schema Drizzle dari DB yang baru direstore
pnpm drizzle-kit introspect --url="$DOCKER_POSTGRES_URL"
```

Setelah langkah 4 selesai dan baseline schema Drizzle sudah tergenerate, instance `agent_dev` yang
lama diperlakukan sebagai **backup/rujukan saja** — semua kerja agent selanjutnya jalan lewat
container docker-compose, bukan connect langsung ke `127.0.0.1:5432` yang lama.

## 3. Struktur Folder Nx (mapping ke domain)

```
nusantara-erp/
├── apps/
│   ├── api/                 # NestJS modular monolith (semua domain sbg Nest module)
│   └── web/                 # Next.js 16
├── libs/
│   ├── shared/               # types, dto, utils, constants lintas domain
│   ├── shared/ui/            # atoms/molecules generik (shadcn/Base UI + Tailwind v4)
│   ├── domain/identity/       # Fase 1
│   ├── domain/org/             # Fase 1
│   ├── domain/master-data/     # Fase 2
│   ├── domain/workflow/        # Fase 3
│   ├── domain/inventory/       # Fase 4
│   ├── domain/sales-crm/       # Fase 5
│   ├── domain/procurement/     # Fase 6
│   ├── domain/finance/         # Fase 7 & 20
│   ├── domain/pos/             # Fase 8
│   ├── domain/manufacturing/   # Fase 9
│   ├── domain/hr-core/         # Fase 10
│   ├── domain/payroll-id/      # Fase 11
│   ├── domain/recruitment-training/ # Fase 12
│   ├── domain/fixed-assets/    # Fase 13
│   ├── domain/project/         # Fase 14
│   ├── domain/field-service/   # Fase 15
│   ├── domain/logistics/       # Fase 16
│   ├── domain/marketplace/     # Fase 17
│   ├── domain/support/         # Fase 18
│   ├── domain/document-legal/  # Fase 19
│   └── domain/platform/        # Fase 21
└── .opencode/
    ├── agent/                 # persona file per agent (Bagian 5)
    ├── skills/                 # aturan & convention project (Bagian 6)
    └── opencode.json           # model routing (Bagian 5.3)
```

Setiap `libs/domain/*` punya Nx **tag** (`domain:inventory`, dst) dan `enforce-module-boundaries`
rule: domain lain wajib akses lewat `index.ts` public API, tidak boleh import file internal.
Ini pagar utama biar agent-agent yang jalan paralel nggak saling tabrak.

### 3.1 Design System Foundation (Fase 0)

Sama seperti Nx module boundary jadi pagar backend, sistem desain frontend **wajib dipatok di
Fase 0 oleh Architect** — bukan diserahkan ke Executor. Kalau tidak, 21 domain × puluhan layar akan
menghasilkan komponen duplikat, spacing tidak konsisten, dan varian button berbeda-beda, apalagi
kalau yang mengerjakan macam-macam model dengan kemampuan berbeda-beda.

Yang dipatok sekali di Fase 0:

1. **Primitive layer: Base UI, bukan Radix.** Per Juli 2026, `shadcn init` sendiri sudah default ke
   Base UI untuk proyek baru — Radix melambat pengembangannya sejak diakuisisi WorkOS, sedangkan
   Base UI (dari tim MUI) lebih rapi untuk interaksi kompleks (combobox, multi-select, nested menu)
   yang banyak dipakai di form-form ERP. Karena nusantara-erp proyek baru, tidak ada alasan pakai
   Radix kecuali ada preferensi lain.
2. **Mapping atomic design ke struktur Nx**, konsisten dengan pagar backend:
   - atoms/molecules generik (Button, Input, DataTable, dll — hasil `shadcn add`) → `libs/shared/ui`
   - organisms/templates spesifik domain (misal `SalesOrderForm`, `PayslipTable`) → ikut lib domain
     masing-masing, **tidak** numpuk di `shared/ui`
3. **Design token** (warna, spacing, radius, typography) didefinisikan sekali lewat Tailwind v4
   `@theme` + `components.json` shadcn, **sebelum layar pertama dibangun**.
4. **Install shadcn MCP server** (`@jpisnice/shadcn-ui-mcp-server --ui-library base`) sebagai tool
   untuk Executor frontend — biar agent narik source komponen asli, bukan mengarang API yang
   mirip-mirip. Fungsinya setara Validator yang mencocokkan balik ke `schema_nusantara.json` di sisi
   backend, hanya ini versi UI-nya. Cek juga apakah opencode bisa menarik skill `shadcn-base` dari
   registry publik — worth diinstall kalau tersedia.

Yang **aman diserahkan ke Executor per-fase** (tidak perlu diputuskan sekarang): layout layar
spesifik, komposisi komponen per fitur, detail UX form bisnis — karena layarnya belum ada, spek
terlalu awal cuma akan salah tebak.

**Soal persona**: tidak perlu persona ke-8 khusus UI/Design — budget konkurensi sudah ketat
(8GB/4-core). Tugas Architect di Fase 0 diperluas untuk juga menetapkan poin 1–3 di atas sekali di
awal, lalu Executor kerja dalam pagar itu memakai MCP shadcn, dan Validator/QA (Bagian 5.2) tinggal
ditambah satu item cek: **"komponen baru pakai `shared/ui` yang sudah ada, bukan bikin ulang."**

## 4. Roadmap Lengkap — 21 Fase, 215 Tabel (urutan prioritas & dependency)

> Semua 215 tabel di schema kamu sudah terverifikasi masuk ke salah satu fase di bawah — tidak ada yang terlewat.
> Asumsi jenis bisnis: general trading/distribusi + jasa (Sales & Inventory diprioritaskan sebelum Manufaktur/POS).
> Kalau bisnis intinya manufaktur atau ritel, urutan Fase 8–9 bisa ditukar — tinggal bilang ke setup agent.

| Fase | Modul | Tabel | Kenapa urutan ini |
|---|---|---|---|
| 0 | Scaffolding | *(bukan tabel — Nx init, CI, docker-compose Postgres/Redis, lint config, base UI kit)* | Fondasi teknis sebelum kode domain apapun |
| 1 | Identity, Tenancy & Org | `tenants, tenant_settings, users, roles, permissions, role_permissions, user_roles, user_organizations, sessions, login_histories, organizations, branches, departments, cost_centers, reporting_lines, job_positions, job_grades, countries, provinces, cities, districts, sub_districts, addresses, number_sequences, audit_logs(+7 partisi), custom_field_definitions, custom_field_values, feature_flags` | Semua tabel lain bergantung ke `tenant_id`, auth, dan struktur organisasi |
| 2 | Master Data Umum | `currencies, exchange_rates, chart_of_accounts, fiscal_periods, item_categories, items, item_variants, units_of_measure, uom_conversions, customers, customer_contacts, customer_addresses, vendors, vendor_contacts, warehouses, warehouse_zones, warehouse_bins, price_lists, price_list_items, tax_codes` | Dipakai hampir semua modul operasional di bawah |
| 3 | Workflow Engine (skeleton) | `workflow_definitions, workflow_steps, workflow_instances, workflow_approval_actions` | Dipakai approval PR/PO/cuti dsb — dibangun basic dulu, diperluas tiap fase berikutnya butuh |
| 4 | Inventory & Stock | `stock_balances, stock_movements(+6 partisi), stock_transfers, stock_opnames, serial_numbers, batch_lots` | Dibutuhkan Sales, Procurement, Manufaktur, POS |
| 5 | Sales & CRM | `leads, opportunities, quotations, quotation_lines, offers, sales_orders, sales_order_lines, sales_targets, commission_rules, discount_rules, promotions` | Modul revenue-facing pertama, value bisnis paling cepat kelihatan |
| 6 | Procurement | `vendor_evaluations, vendor_quotations, purchase_requisitions, purchase_requisition_lines, request_for_quotations, purchase_orders, purchase_order_lines, goods_receipts, procurement_contracts` | Mirror sisi beli dari Sales |
| 7 | Finance Inti (GL + AR/AP + Pajak) | `journal_entries, journal_entry_lines, budgets, budget_lines, budget_revisions, cost_pools, cost_allocations, banks, bank_accounts, bank_transactions, bank_reconciliations, ar_invoices, ar_receipts, ar_receipt_allocations, ap_invoices, ap_payments, ap_payment_allocations, tax_invoices, tax_returns, withholding_tax_records` | Menutup siklus dari Sales/Procurement ke pembukuan |
| 8 | POS | `pos_terminals, pos_shifts, pos_transactions, pos_transaction_lines, pos_payments` | Opsional tergantung fokus bisnis — bisa ditukar urutan dengan Fase 9 |
| 9 | Manufaktur / MRP | `bill_of_materials, bom_lines, routings, routing_operations, production_plans, material_requirements, work_orders, work_order_operations, quality_standards, quality_inspections, non_conformance_reports, corrective_actions, scrap_records` | Kompleks, butuh Inventory+Item master matang dulu |
| 10 | HR Core | `employees, employee_contracts, employee_family_members, attendance_records, shift_schedules, overtime_requests, leave_types, leave_requests, leave_balances` | Fondasi sebelum payroll |
| 11 | Payroll Indonesia | `payroll_components, payroll_runs, employee_payslips, pph21_calculations, bpjs_kesehatan_records, bpjs_ketenagakerjaan_records` | Butuh HR Core + Finance (posting ke GL) |
| 12 | Rekrutmen & Training | `recruitment_requisitions, candidates, interview_schedules, training_programs, training_enrollments, certifications, performance_reviews, kpi_definitions, kpi_scores` | Non-kritikal untuk operasional harian, taruh setelah payroll |
| 13 | Fixed Assets | `asset_categories, fixed_assets, asset_depreciation_schedules, asset_disposals` | Terhubung ke Finance, tapi berdiri sendiri |
| 14 | Project Management | `projects, project_tasks, project_milestones, project_resources, project_budgets, project_billing, timesheets` | Berdiri cukup independen |
| 15 | Field Service & Maintenance | `service_requests, service_reports, service_schedules, field_technicians, sla_policies, maintenance_schedules, maintenance_work_orders, spare_parts, fleet_vehicles, work_requests` | Modul spesialis, prioritas rendah kecuali fokus bisnis jasa lapangan |
| 16 | Delivery / Logistics | `delivery_orders, delivery_routes, shipment_tracking` | Ekstensi dari Sales Order fulfillment |
| 17 | Marketplace Integration | `marketplace_connections, marketplace_orders, marketplace_product_mappings` | Integrasi eksternal, taruh setelah Sales & Inventory solid |
| 18 | Support / Ticketing | `tickets, ticket_categories, ticket_comments` | Independen, prioritas rendah |
| 19 | Document Management & Legal | `documents, document_folders, document_versions, contracts, contract_clauses, legal_documents, licenses_permits` | Bisa nyusul kapan saja, tidak jadi blocker modul lain |
| 20 | Finance Lanjutan (Multi-company) | `intercompany_transactions, intercompany_reconciliations, intercompany_eliminations` | Fitur akuntansi lanjutan, hanya relevan kalau multi-entitas |
| 21 | Platform Polish & Reporting | `dashboards, dashboard_widgets, report_definitions, saved_filters, notifications, notification_templates, webhook_subscriptions, integration_sync_logs, import_jobs, import_job_errors, scheduled_jobs, job_execution_logs, activity_logs, api_keys, subscription_plans, tenant_subscriptions, usage_meters, consent_records, data_subject_requests, data_breach_incidents, data_retention_policies` | Fitur pelengkap SaaS, dicicil paralel dengan fase manapun yang sedang jalan |

**MVP realistis untuk demo pertama** = Fase 0–5 (Identity → Master Data → Workflow skeleton →
Inventory → Sales/CRM). Itu sudah alur bisnis end-to-end (quotation → sales order → stock keluar)
yang bisa didemokan, sebelum lanjut ke Procurement & Finance.

## 5. Sistem Multi-Agent OpenCode

### 5.1 Kapasitas Paralel (berdasarkan 8GB RAM / 4-core)

Baseline yang selalu jalan lokal: Postgres (~400MB) + Redis (~100MB) + Next dev server (~400MB) +
Nest dev server (~500MB) ≈ **1.5–2GB** sudah terpakai sebelum agent apapun jalan. Sisa ~5-6GB
dan 4 core harus dibagi ke proses agent.

Bagi agent jadi 2 kelas:
- **Agent berat** (menjalankan build/typecheck/test lokal — CPU & RAM intensif): Executor, Tester.
- **Agent ringan** (baca kode + LLM call, tanpa eksekusi build lokal — I/O bound, nunggu API): Architect, Validator, Security, QA, DevOps (kecuali saat DevOps menjalankan `nx build`).

**Aturan konkret:**
1. Maksimal **1 agent berat aktif** dalam satu waktu di awal. Kalau setelah beberapa fase mesin
   terbukti stabil (tidak swap/lag), boleh naik ke 2 agent berat paralel — tapi ini harus dicoba
   bertahap, bukan diasumsikan aman dari awal.
2. Agent ringan boleh jalan bersamaan lebih banyak (2-3), karena mereka nunggu respons API, bukan mengunyah CPU lokal.
3. Pipeline per modul dibuat **staggered**, bukan semua fase modul dobel dijalankan sekaligus:
   `Architect (rencana modul A) → Executor (kode A) → Tester (test A)`, sementara Architect sudah
   mulai rencana modul B di background (agent ringan, aman paralel).
4. Validator/Security/QA jalan setelah Tester modul A selesai, sebagai review pass — bisa paralel
   satu sama lain (mereka cuma baca, tidak build).

**Nx Cloud (Hobby, gratis selamanya — 50rb credit/bulan)**: connect dari Fase 0. Remote cache-nya
gratis dan tidak ada downside. Kalau nanti mesin lokal terasa jadi bottleneck, **Nx Agents**
(distributed task execution via CI) bisa offload build/test berat ke luar mesin — masih dalam kuota
gratis.

### 5.2 Persona Agent

| Persona | Tanggung jawab | Kelas | Kapan dipakai |
|---|---|---|---|
| **Architect** | Desain migration **incremental di atas baseline introspeksi** (Bagian 2.2) — bukan menulis skema dari nol, kontrak API (OpenAPI), pembagian file per Nx lib, dependency antar modul. **Fase 0 saja, tambahan**: menetapkan Design System Foundation (Bagian 3.1) — primitive layer Base UI, mapping atomic design ke `shared/ui` vs lib domain, design token Tailwind v4 `@theme` | Ringan | Awal tiap modul, sekali jalan (tidak paralel dgn dirinya sendiri) |
| **Executor** | Implementasi: migration, entity/schema Drizzle, service, controller, DTO, komponen Next.js (pakai MCP shadcn untuk narik komponen asli, bukan mengarang API) | Berat | Setelah Architect approve rencana |
| **Tester** | Unit + integration test (Vitest) untuk kode dari Executor | Berat | Setelah Executor selesai 1 slice kerja |
| **Validator** | Cocokkan implementasi vs `schema_nusantara.json` (tipe kolom, relasi) dan vs `openapi.json`, cek `nx lint` boundary rules lolos, **plus cek komponen baru pakai `shared/ui` yang sudah ada — bukan bikin ulang** | Ringan | Setelah Tester lolos |
| **Security** | Cek isolasi tenant (`WHERE tenant_id = ...` konsisten di semua query), secrets tidak hardcode, validasi input, RBAC pada endpoint baru | Ringan | Setelah Tester, sebelum merge |
| **QA** | Cek logika bisnis vs roadmap, edge case, khusus Fase 11: kebenaran regulasi PPh21/BPJS | Ringan | Setelah Tester, sebelum merge |
| **DevOps** | Nx workspace config, CI (GitHub Actions free tier), docker-compose lokal, env template, deploy script Vercel/Supabase | Ringan (berat saat `nx build`) | Fase 0 (setup awal) + tiap kali ada surface baru yang perlu di-deploy |

### 5.3 Model Routing (biar tetap 100% gratis)

Berdasarkan riset terbaru:
- **OpenCode Zen (free tier)**: model gratis-nya rotasi terus (pernah `deepseek-v4-flash-free`,
  fallback darurat `big-pickle`). Jangan hardcode nama model di config — instruksikan DevOps agent
  untuk cek daftar model Zen free terkini saat setup (`opencode models` atau dashboard Zen), lalu isi
  `opencode.json` dengan model yang aktif saat itu.
- Pertimbangkan install **`opencode-tier`** (npm, community tool) — otomatis menurunkan tier
  model sesuai sisa budget/rate limit, sampai ke tier gratis penuh saat limit menipis. Ini persis
  yang kamu minta ("auto model free").
- **Google Antigravity** (free tier, rate-limited per minggu): punya Gemini 3 Pro/Flash + Claude
  Sonnet gratis. Cocok jadi **kanal cadangan untuk Architect/Validator/Security/QA** (kerja
  reasoning, bukan eksekusi lokal) — karena jalan di infra Google, tidak membebani RAM 8GB kamu.
- **GitHub Copilot (VS Code)**: kanal cadangan untuk Executor kalau OpenCode Zen kena limit —
  cocok untuk edit kecil/menengah.

Ringkasan alokasi: Architect/Validator/Security/QA → prioritaskan Antigravity (gratis, di luar
mesin) saat tersedia, fallback OpenCode Zen. Executor/Tester → OpenCode Zen (lokal, perlu akses
filesystem project), fallback Copilot untuk potongan kecil.

### 5.4 Git Workflow Multi-Agent

Pagar wajib supaya agent paralel tidak saling timpa kerjaan:

- Tiap task Executor kerja di **branch sendiri**, format `agent/fase-01-identity/users-module`, dst
  — tidak pernah commit langsung ke `main`.
- Kamu (manusia) yang **merge PR** setelah Validator + Security + QA hijau semua — bukan otomatis
  di-merge oleh agent manapun.
- Satu branch = satu slice kerja Executor, biar review Validator/Security/QA per PR tetap fokus dan
  gampang di-diff.

## 6. Skill & Tooling yang perlu dicari/di-install oleh setup agent

- Nx generator resmi: `@nx/nest`, `@nx/next`, `@nx/vite` (Vitest — sudah diputuskan, bukan opsional
  lagi), `@nx/eslint`. Semua install lewat **pnpm**.
- Install **shadcn MCP server** (`@jpisnice/shadcn-ui-mcp-server --ui-library base`) sebagai tool
  untuk Executor frontend, sesuai Bagian 3.1 — biar agent narik source komponen shadcn/Base UI asli,
  bukan mengarang API yang mirip-mirip.
- Cek apakah opencode bisa menarik skill `shadcn-base` dari registry publik — install kalau tersedia,
  sebagai pelengkap MCP server di atas.
- Cek apakah OpenCode punya skill/plugin marketplace untuk Nx/NestJS/Drizzle — kalau ada, install;
  kalau tidak ada yang cocok, **buat skill custom lokal** di `.opencode/skills/`:
  - `tenant-isolation-rules.md` — aturan wajib filter `tenant_id` di setiap query domain multi-tenant.
  - `nx-module-boundaries.md` — cara Executor harus akses domain lain (lewat public API/index.ts saja).
  - `payroll-id-rules.md` — referensi perhitungan PPh21 & BPJS untuk Fase 11 (harus diverifikasi ke
    sumber resmi DJP/BPJS saat implementasi, jangan andalkan hafalan model).
  - `partitioned-table-migration.md` — pola migration untuk tabel partisi bulanan (`audit_logs_p*`,
    `stock_movements_p*`) + job otomatis bikin partisi bulan berikutnya.

## 7. Aturan Kualitas & Keamanan (wajib, non-negotiable)

1. Setiap query yang menyentuh tabel dengan kolom `tenant_id` **wajib** difilter tenant — Security
   agent memblokir merge kalau ada yang lolos tanpa ini.
2. Nx module boundary (`enforce-module-boundaries`) wajib lolos sebelum kode dianggap selesai.
3. Setiap Executor slice harus punya test dari Tester sebelum dianggap "done" — tidak ada kode
   tanpa test yang masuk ke roadmap tracker.
4. Migration untuk tabel partisi (audit_logs, stock_movements) harus idempotent & ada strategi auto
   partisi bulan depan (job terjadwal, masuk domain `platform` Fase 21 tapi infrastruktur-nya
   disiapkan DevOps di Fase 0).
5. Tidak ada secret/API key hardcode dan tidak ada `process.env.X` tersebar bebas — semua akses env
   wajib lewat `env.ts` bertipe (validasi Zod) per app, di-review Security agent.
6. Komponen UI baru wajib pakai `libs/shared/ui` yang sudah ada (hasil `shadcn add` via MCP server)
   sebelum bikin komponen baru — dicek Validator/QA sesuai Bagian 3.1 & 5.2.
7. **Tidak ada `DROP DATABASE`, `TRUNCATE`, atau `drizzle-kit push --force`** ke database dev tanpa
   dump terbaru tersedia dan persetujuan eksplisit manusia (Bagian 2.2) — berlaku sejak Fase 0,
   sebelum data asli mulai terisi.

## 8. Instruksi Konkret untuk AI Setup Agent

Eksekusi berurutan:

1. Inisialisasi Nx workspace dengan **pnpm** sebagai package manager
   (`npx create-nx-workspace@latest nusantara-erp --pm=pnpm`), pilih preset kosong, push ke
   `github.com/hanifjbg/nusantara-erp.git`.
2. Generate struktur folder sesuai Bagian 3.
3. **Design System Foundation (Bagian 3.1)** — sebelum layar pertama dibuat: jalankan `shadcn init`
   (default Base UI), atur `components.json` + Tailwind v4 `@theme` untuk design token, tambahkan
   atoms/molecules awal (Button, Input, DataTable, dll) ke `libs/shared/ui` via `shadcn add`, dan
   install shadcn MCP server (`@jpisnice/shadcn-ui-mcp-server --ui-library base`) sebagai tool
   Executor frontend.
4. Setup **i18n** (`next-intl` atau setara) di `apps/web` dari awal — struktur locale minimal
   Indonesia + Inggris, meski konten belum diterjemahkan penuh.
5. **Migrasi DB existing (Bagian 2.2, wajib sebelum lanjut)**: cek versi Postgres instance `agent_dev`
   di `127.0.0.1:5432` (via env, bukan hardcode) vs target Postgres 18 → `pg_dump` format plain →
   buat `docker-compose.yml` (Postgres 18 + Redis) → restore dump ke container baru → jalankan
   `drizzle-kit introspect` untuk generate baseline schema Drizzle. Setup juga worker BullMQ proses
   persisten untuk job lokal (Bagian 2.1). Instance `agent_dev` lama jadi backup saja setelah ini.
6. Buat `env.ts` bertipe (validasi Zod) per app (`apps/api`, `apps/web`) — jangan biarkan agent
   mengakses `process.env.X` langsung di tempat lain.
7. Connect **Nx Cloud** (Hobby, gratis) ke workspace untuk remote cache sejak Fase 0.
8. Buat file `AGENTS.md` di root berisi ringkasan Bagian 2, 2.1, 2.2, 3, 3.1, 7 (jadi rujukan semua
   agent), termasuk aturan Git workflow (Bagian 5.4): branch per task
   `agent/fase-XX-domain/nama-modul`, tidak ada commit langsung ke `main`, merge PR manual setelah
   Validator+Security+QA hijau.
9. Buat 7 file persona di `.opencode/agent/` (satu per persona di Bagian 5.2), masing-masing berisi:
   tanggung jawab, batasan (hanya boleh sentuh lib sesuai tag Nx), dan model yang dipakai (Bagian 5.3).
   Persona Architect eksplisit mencantumkan tugas Design System Foundation untuk Fase 0.
10. Buat `.opencode/opencode.json` dengan model routing dari Bagian 5.3 — **cek dulu model Zen free
    yang aktif saat ini**, jangan copy nama model dari dokumen ini mentah-mentah karena rotasinya cepat.
11. Buat skill files di `.opencode/skills/` sesuai Bagian 6, termasuk skill `shadcn-base` kalau
    tersedia di registry publik opencode.
12. Buat `docs/roadmap.md` = salinan tabel Bagian 4, dengan checkbox per fase untuk tracking progres.
13. Setup CI dasar (GitHub Actions, pnpm): lint + build + test (Vitest) on push, gratis untuk repo
    public/hobby.
14. Setup deploy target: Next.js + NestJS API sama-sama ke Vercel serverless (connection pooler
    Supavisor, `prepare: false`), plus Upstash QStash untuk job terjadwal non-harian (Bagian 2.1).
15. Baru setelah 1–14 selesai dan direview manual oleh kamu → mulai Fase 1 dengan pipeline
    Architect → Executor → Tester → Validator/Security/QA sesuai Bagian 5.1.

**Jangan** langsung generate kode untuk 215 tabel dalam satu batch. Setiap fase = 1 siklus review
sebelum lanjut fase berikutnya.
