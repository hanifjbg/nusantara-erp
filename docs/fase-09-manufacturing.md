# Fase 09 — Manufaktur / MRP

> **Goal**: Produksi dari BoM + routing + quality dalam ERP.
> **Dependency**: Fase 01, 02 (items, uom), 04 (stock in/out komponen → barang jadi).
> **Tabel (13)**: bill_of_materials, bom_lines, routings, routing_operations, production_plans, material_requirements, work_orders, work_order_operations, quality_standards, quality_inspections, non_conformance_reports, corrective_actions, scrap_records

## Deliverable
- **Architect**: model b.o.m (multi-level) + mrp kasar + work order, kontrak OpenAPI, `domain:manufacturing`.
- **Executor**: BoM & routing (versioning, effective date), production plan → material requirement, work order (picking komponen, produksi, barang jadi + scrap), quality (standards/inspections/NCR/corrective action).
- **Tester**: BoM multi-level material explosion, stock in/out component atomic, scrap allocation, quality inspection pass/fail flow.
- **Validator/Security/QA**: conformity; tenant filter; validator ulang level; demo production run (screenshot).

## Acceptance criteria
- [ ] Work order consume komponen & menghasilkan barang jadi (dengan waste/scrap tercatat).
- [ ] Material requirement memo dari BoM × qty.
- [ ] Quality inspection mengunci WO sampai hasil.
- [ ] Batch/lot di barang jadi.

## Dependensi
- Inventory Fase 4 inti.

## Skill
`partitioned-table-migration` (bila stock_movements terlibat), `tenant-isolation-rules`.