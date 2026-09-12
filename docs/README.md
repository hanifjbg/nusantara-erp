# nusantara-erp — Dokumentasi

> Rabas by membaca `AGENTS.md` dulu. Ini index seluruh pengetahuan workspace.
> Repo: `github.com/hanifjbg/nusantara-erp` (public) · Nx monorepo · pnpm · Next.js 16 + NestJS + Drizzle + Postgres 18 + Redis.

## Cara baca (urut)
1. `AGENTS.md` — aturan wajib (DB, boundary, design system, git, pipeline).
2. `00-architecture.md` — keputusan arsitektur & alasan.
3. `roadmap.md` — 21 fase + status checkbox.
4. `99-orchestration.md` — pipeline multi-agent, budget paralel, model routing, git workflow.
5. `fase-00-*.md` s.d. `fase-21-*.md` — spec granular per fase (tujuan, tabel, deliverable, acceptance).
6. `schema_nusantara.json` — spesifikasi 215 tabel (rujukan Validator/DB), Blueprint di `nusantara-erp-blueprint.md` sebagai sumber otoritatif Bagian 1-8.

## Map file
| File | Isi |
|---|---|
| `00-architecture.md` | Arsitektur: monorepo Nx, Nest modular monolith, job/queue lokal vs Vercel, DB migration, env, deploy |
| `roadmap.md` | 21 fase: tabel, prioritas, dependency, status |
| `99-orchestration.md` | Persona, pipeline per modul, budget 8GB/4-core, model routing, branch/PR |
| `fase-00-*` | Scaffolding (repo, CI, docker-compose, design system, baseline Drizzle) |
| `fase-01-*` … `fase-21-*` | Spec domain per fase |

## Peran dokumen
- **Agent/i manusia (sesi baru)** → mulai dari `AGENTS.md` + `roadmap.md` + `99-orchestration.md`.
- **Agent di luar opencode** → dokumen ini cukup berdiri sendiri; ikuti spec fase + acceptance criteria.

> Aturan kualitas: tiap fase = 1 siklus review. Jangan loncat sebelum hijau.