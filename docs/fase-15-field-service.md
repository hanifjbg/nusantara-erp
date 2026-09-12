# Fase 15 — Field Service & Maintenance

> **Goal**: Permintaan servis lapangan, SLA, maintenance & fleet.
> **Dependency**: Fase 01, 02, 04 (spare parts = items).
> **Tabel (10)**: service_requests, service_reports, service_schedules, field_technicians, sla_policies, maintenance_schedules, maintenance_work_orders, spare_parts, fleet_vehicles, work_requests

## Deliverable
- **Architect**: model servis/SLA/maintenance, `domain:field-service`.
- **Executor**: service_request (assign teknisi via SLA), service_report (pekerjaan + spare parts), schedules, maintenance_WO (preventive vs corrective), fleet.
- **Tester**: SLA breach calculation, spare part consumption (stock out via Fase 4), maintenance WO stat tinggi.
- **Validator/Security/QA**: conformity; tenant filter; demo (screenshot).

## Acceptance criteria
- [ ] Request → dispatch → report; SLA terukur.
- [ ] Spare parts terpakai terkurangi stok.
- [ ] Maintenance preventive dijadwalkan (interop dengan job platform).

## Dependensi
- Inventory Fase 4 (spare parts).

## Skill
`tenant-isolation-rules`.