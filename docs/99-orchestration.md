# 99 — Orkestrasi Multi-Agent

Sumber otoritatif: blueprint Bagian 5. Ringkasan operasional cara menjalankan workspace dengan AI agents.

## 1. Persona (7) — `.opencode/agent/*.md`
| Persona | Mode | Kelas | Peran di pipeline |
|---|---|---|---|
| Architect | plan | ringan | Rancang migration incremental + OpenAPI + Nx lib map. Fase 0: Design System Foundation |
| Executor | build | berat | Implementasi (Drizzle entity/service/controller/DTO, komponen Next via MCP shadcn) |
| Tester | build | berat | Unit/integration test Vitest untuk tiap slice Executor |
| Validator | plan | ringan | Cocokkan vs schema_nusantara.json + openapi.json + boundary lint + reuse shared/ui |
| Security | plan | ringan | Tenant isolation, secrets, validasi input, RBAC |
| QA | plan | ringan | Logika bisnis, edge case, evidence screenshot; Fase 11: PPh21/BPJS ke sumber resmi |
| DevOps | build | ringan (berat saat build) | Nx config, CI, docker-compose, env, deploy, backup, Nx Cloud, model routing |

## 2. Pipeline per modul (staggered)
```
Architect(A) → Executor(A) → Tester(A) → [Validator + Security + QA] review → merge manual
        └──── architect(B) jalan paralll (ringan)
```
- 1 **agent berat** aktif maksimal (stabil → 2, bertahap). 2–3 agent ringan paralel OK.
- Baseline lokal ~1.5–2GB (Postgres+Redis+Next dev+Nest dev) dari 8GB total.
- Tidak pernah seluruh fase domain berjalan paralel penuh.

## 3. Git workflow
- Branch per slice: `agent/fase-XX-<domain>/<modul>` — tidak commit langsung ke `main`.
- **Merge manual oleh manusia** setelah Validator+Security+QA hijau — agent tidak auto-merge.
- Satu branch = satu slice kerja. Conventional Commits, satu task = satu commit.
- Jangan force-push / hapus branch `main`.

## 4. Model routing (100% gratis — JANGAN hardcode nama)
- Model Zen free **berotasi cepat** → DevOps cek `opencode models` saat setup, isi `opencode.json`.
- Alokasi (blueprint 5.3):
  - Architect/Validator/Security/QA → kanal reasoning ringan (Google Antigravity / Zen) — di luar mesin, hemat RAM.
  - Executor/Tester → Zen lokal (butuh filesystem); fallback Copilot utk edit kecil.
- `opencode-tier` (npm) opsional: menurunkan tier sesuai rate limit sampai ke tier gratis.
- Konfigurasi saat ini (`opencode.json`): `model: opencode/big-pickle`, `small_model: opencode/ling-3.0-flash-fin-free`.

## 5. Quality gates (sebelum merge)
1. Lint + typecheck + build lulus (dieksekusi).
2. DB verifikasi nyata (psql/MCP): constraint/RLS/tenant filter, migration idempotent.
3. Test Tester ada utk tiap slice.
4. Boundary lint hijau; reuse shared/ui.
5. Security approve (tenant filter, no secrets).
6. QA approve + evidence (screenshot → `docs/qa/`).
7. Blueprint: **tidak ada DROP/TRUNCATE/push --force** tanpa dump + izin.

## 6. Rujukan cepat
- `AGENTS.md` · `docs/00-architecture.md` · `docs/roadmap.md` · skill di `.opencode/skills/`.