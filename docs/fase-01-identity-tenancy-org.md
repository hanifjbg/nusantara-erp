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
- [ ] Login JWT berfungsi; refresh token aman.
- [ ] RBAC: role/permission granular; user multi-org; data terisolasi per tenant (test bukti).
- [ ] Number sequence: format & increment per tenant.
- [ ] Audit log masuk partisi bulan berjalan; re-run migration idempotent.
- [ ] RLS: query dari role app hanya lihat tenant-nya.

## Dependensi
- Auth dipakai Fase 2+ (semua API perlu context user/tenant).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, `partitioned-table-migration`.