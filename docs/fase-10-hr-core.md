# Fase 10 — HR Core

> **Goal**: Fondasi data pegawai, kehadiran, cuti sebelum payroll.
> **Dependency**: Fase 01 (org, users), Fase 02.
> **Tabel (9)**: employees, employee_contracts, employee_family_members, attendance_records, shift_schedules, overtime_requests, leave_types, leave_requests, leave_balances

## Deliverable
- **Architect**: model employee↔user, kontrak OpenAPI, `domain:hr-core`.
- **Executor**: CRUD employees + contracts, attendance (manual/import), shift schedule, overtime request (approval via Fase 3), leave types/requests/balances (approval, saldo).
- **Tester**: saldo cuti (accrual & take), overtime calc, approval workflow hook, attendance duplicate prevention.
- **Validator/Security/QA**: conformity; tenant filter; privacy (data pribadi) — akses strictly role-based; demo attendance & leave (screenshot).

## Acceptance criteria
- [ ] Employee ↔ user link benar; riwayat kontrak.
- [ ] Cuti: accrual per policy, take mengurangi saldo, approval flow.
- [ ] Attendance tidak duplikat per hari/shift.
- [ ] Overtime request terhitung jam & ter-approve.

## Dependensi
- Payroll Fase 11 (perlu data employee + attendance).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.