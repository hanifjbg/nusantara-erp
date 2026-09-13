# Fase 01 — Identity, Tenancy & Org

> **Goal**: Fondasi multi-tenant: auth, RBAC, organisasi, wilayah, numbering, audit, custom fields, feature flags.
> **Dependency**: Fase 00. Semua fase lain driviten di atas skema ini.
> **Tabel (29)**: tenants, tenant_settings, users, roles, permissions, role_permissions, user_roles, user_organizations, sessions, login_histories, organizations, branches, departments, cost_centers, reporting_lines, job_positions, job_grades, countries, provinces, cities, districts, sub_districts, addresses, number_sequences, audit_logs(+7 partisi), custom_field_definitions, custom_field_values, feature_flags

## Deliverable (per persona)
- **Architect**: migration incremental di atas baseline; kontrak OpenAPI auth/RBAC/org; Nx map `domain:identity` (libs/domain/identity) & `domain:org`; sisihkan `tenant_id` central helper.
- **Executor**: skema Drizzle + service/controller (login, JWT, refresh, tenants, users, roles/permissions, organizations, branches, departments, addresses, number_sequences, audit log, custom fields, feature flags). Auth Nest custom Passport/JWT.
- **Tester**: test login/RBAC/multi-org/tenant isolation (Tester). Partisi audit_logs test idempotency.
- **Validator**: cocokkan vs schema_nusantara.json (kolom, relasi), openapi.json, boundary lint.
- **Security**: tenant filter pada semua query, no secrets, JWT expiry/refresh, RBAC endpoint.
- **QA**: alur: buat org → user → role/permission → login → data org terpisah antar tenant. Evidence screenshot.

## Acceptance criteria
- [x] Login JWT berfungsi; refresh token aman.
- [x] RBAC: role/permission granular; user multi-org; data terisolasi per tenant (test bukti).
- [x] Number sequence: format & increment per tenant.
- [x] Audit log masuk partisi bulan berjalan; re-run migration idempotent.
- [x] RLS: query dari role app hanya lihat tenant-nya.

## Status realita — 2026-09-12 (terverifikasi eksekusi)
- Migration `apps/api/drizzle/`: `0000` (28 tabel + audit terpartisi p2026_09/p2026_10/p_default),
  `0001` (functions + 16 policy RLS), `0002` (id defaults). Migrate + re-run idempotent hijau.
- API: `/auth/*` (bootstrap terkunci setelah tenant pertama, login, refresh rotation, logout, me),
  `/tenants`, `/users`, `/rbac`, `/org`, `/geo`, `/system` (numbering, audit-logs, custom-fields).
  Guard global JWT + `@RequirePermissions`, tenant selalu dari JWT, ZodError → 400.
- Test: 16 api (8 integrasi DB: login, refresh rotation, isolasi tenant, RBAC, numbering atomik,
  routing partisi audit, infra RLS) + unit identity/org/web — semua hijau, cleanup 0 sisa.
- E2E HTTP `scripts/e2e-fase01.mjs`: 20/20 (bootstrap→login→org/user/role→numbering→audit→refresh/logout,
  401/403/400 negatif). Ulangi: `psql -f scripts/e2e-fase01-cleanup.sql` lalu `node scripts/e2e-fase01.mjs`.
- RLS: 16 policy `*_tenant_isolation` (fail-closed bila `app.tenant_id` unset — terbukti via psql);
  role `agent` non-CREATEROLE sehingga bukti via simulasi predikat, bukan role terpisah (dicatat jujur).
  Enforcement primer = filter service-level (`tenantEq`), RLS = lapis kedua (gigit untuk user non-owner).
- Deviasi sadar dari baseline: `user_roles` tanpa PK (kolom nullable) → unique index + enforcement service;
  PK `audit_logs` = (id, created_at) (syarat tabel terpartisi); PK semua tabel default
  `gen_random_uuid()` DB-side + `uuidv7()` app-side; `org` boleh depend ke `identity` (boundary).
- Pelajaran tsx/esbuild: tanpa decorator metadata → semua injeksi DI wajib `@Inject` eksplisit.

## Dependensi
- Auth dipakai Fase 2+ (semua API perlu context user/tenant).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, `partitioned-table-migration`.