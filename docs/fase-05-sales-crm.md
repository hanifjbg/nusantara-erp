# Fase 05 — Sales & CRM

> **Goal**: Modul revenue-facing pertama — leads → opportunity → quotation → sales order → stock keluar. Ini "MVP demo" bersama Fase 0–4.
> **Dependency**: Fase 01, 02 (items, price lists, uom), 03 (approval), 04 (stock).
> **Tabel (11)**: leads, opportunities, quotations, quotation_lines, offers, sales_orders, sales_order_lines, sales_targets, commission_rules, discount_rules, promotions

## Deliverable
- **Architect**: alur dokumen (draft/confirm/close), kontrak OpenAPI (quotation/order), otomasi ke inventory (order confirm → stock out via Fase 4 service), Nx `domain:sales-crm`.
- **Executor**: CRUD leads/opportunities; quotation (header+lines, tax, discount), convert → sales_order; order → posting stock keluar (atomic); sales_targets/commission/discount/promotion rules.
- **Tester**: kalkulasi total (line qty×price−discount+tax), validasi stok cukup, konversi quotation→order, aturan diskon/promosi, commission calc, duplikasi order.
- **Validator/Security/QA**: conformity; tenant filter; RBAC (sales vs admin); alur demo lengkap quotation→stock keluar (screenshot status & stock).

## Acceptance criteria
- [ ] Quotation CSR → approve (workflow) → convert SO → stock keluar, saldo update.
- [ ] Kalkulasi finansial benar (decimal 19,4); pajak via tax_codes.
- [ ] Discount rule & promotion apply benar (prioritas ditentukan).
- [ ] Stock negative diblokir (policy).
- [ ] Sales target & commission terhitung per salesperson.

## Dependensi
- Penanda alur end-to-end Fase 0–5 (MVP) — wajib demo sukses sebelum lanjut Fase 6.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, `shadcn-base`.