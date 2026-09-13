# Roadmap — 21 Fase, 215 Tabel

> Copy dari blueprint Bagian 4. Centang per fase saat selesai. **Satu fase = satu siklus review.**
> MVP demo pertama = Fase 0–5. Asumsi bisnis: general trading/distribusi + jasa. (Bila fokus manufaktur/ritel, tukar urutan Fase 8–9.)

| Fase | Modul | Tabel | Status |
|---|---|---|---|
| 0 | Scaffolding | *(infra: repo, CI, docker-compose Postgres/Redis, lint config, base UI kit, baseline Drizzle)* | 🔶 hijau lokal 2026-09-12, sisa: Nx Cloud connect manual + CI run pertama |
| 1 | Identity, Tenancy & Org | tenants, tenant_settings, users, roles, permissions, role_permissions, user_roles, user_organizations, sessions, login_histories, organizations, branches, departments, cost_centers, reporting_lines, job_positions, job_grades, countries, provinces, cities, districts, sub_districts, addresses, number_sequences, audit_logs(+7), custom_field_definitions, custom_field_values, feature_flags | ✅ hijau 2026-09-12 (28 tabel + RLS + API + test + E2E 20/20) |
| 2 | Master Data Umum | currencies, exchange_rates, chart_of_accounts, fiscal_periods, item_categories, items, item_variants, units_of_measure, uom_conversions, customers, customer_contacts, customer_addresses, vendors, vendor_contacts, warehouses, warehouse_zones, warehouse_bins, price_lists, price_list_items, tax_codes | ✅ hijau 2026-09-12 (20 tabel + RLS + ~30 endpoint + E2E 18/18; UI ditunda) |
| 3 | Workflow Engine (skeleton) | workflow_definitions, workflow_steps, workflow_instances, workflow_approval_actions | ⬜ |
| 4 | Inventory & Stock | stock_balances, stock_movements(+6), stock_transfers, stock_opnames, serial_numbers, batch_lots | ⬜ |
| 5 | Sales & CRM | leads, opportunities, quotations, quotation_lines, offers, sales_orders, sales_order_lines, sales_targets, commission_rules, discount_rules, promotions | ⬜ |
| 6 | Procurement | vendor_evaluations, vendor_quotations, purchase_requisitions, purchase_requisition_lines, request_for_quotations, purchase_orders, purchase_order_lines, goods_receipts, procurement_contracts | ⬜ |
| 7 | Finance Inti (GL+AR/AP+Pajak) | journal_entries, journal_entry_lines, budgets, budget_lines, budget_revisions, cost_pools, cost_allocations, banks, bank_accounts, bank_transactions, bank_reconciliations, ar_invoices, ar_receipts, ar_receipt_allocations, ap_invoices, ap_payments, ap_payment_allocations, tax_invoices, tax_returns, withholding_tax_records | ⬜ |
| 8 | POS | pos_terminals, pos_shifts, pos_transactions, pos_transaction_lines, pos_payments | ⬜ |
| 9 | Manufaktur / MRP | bill_of_materials, bom_lines, routings, routing_operations, production_plans, material_requirements, work_orders, work_order_operations, quality_standards, quality_inspections, non_conformance_reports, corrective_actions, scrap_records | ⬜ |
| 10 | HR Core | employees, employee_contracts, employee_family_members, attendance_records, shift_schedules, overtime_requests, leave_types, leave_requests, leave_balances | ⬜ |
| 11 | Payroll Indonesia | payroll_components, payroll_runs, employee_payslips, pph21_calculations, bpjs_kesehatan_records, bpjs_ketenagakerjaan_records | ⬜ |
| 12 | Rekrutmen & Training | recruitment_requisitions, candidates, interview_schedules, training_programs, training_enrollments, certifications, performance_reviews, kpi_definitions, kpi_scores | ⬜ |
| 13 | Fixed Assets | asset_categories, fixed_assets, asset_depreciation_schedules, asset_disposals | ⬜ |
| 14 | Project Management | projects, project_tasks, project_milestones, project_resources, project_budgets, project_billing, timesheets | ⬜ |
| 15 | Field Service & Maintenance | service_requests, service_reports, service_schedules, field_technicians, sla_policies, maintenance_schedules, maintenance_work_orders, spare_parts, fleet_vehicles, work_requests | ⬜ |
| 16 | Delivery / Logistics | delivery_orders, delivery_routes, shipment_tracking | ⬜ |
| 17 | Marketplace Integration | marketplace_connections, marketplace_orders, marketplace_product_mappings | ⬜ |
| 18 | Support / Ticketing | tickets, ticket_categories, ticket_comments | ⬜ |
| 19 | Document & Legal | documents, document_folders, document_versions, contracts, contract_clauses, legal_documents, licenses_permits | ⬜ |
| 20 | Finance Lanjutan (Multi-company) | intercompany_transactions, intercompany_reconciliations, intercompany_eliminations | ⬜ |
| 21 | Platform Polish & Reporting | dashboards, dashboard_widgets, report_definitions, saved_filters, notifications, notification_templates, webhook_subscriptions, integration_sync_logs, import_jobs, import_job_errors, scheduled_jobs, job_execution_logs, activity_logs, api_keys, subscription_plans, tenant_subscriptions, usage_meters, consent_records, data_subject_requests, data_breach_incidents, data_retention_policies | ⬜ |

## Dependency map & alur MVP
```
Fase 0 (scaffold) → 1 (identity/org → tenant_id semua) → 2 (master data) → 3 (workflow skeleton)
→ 4 (stock) → 5 (sales/crm)  =  MVP: quotation → sales order → stock keluar
→ 6 procurement → 7 finance inti → 8 POS → 9 manufaktur → 10 hr → 11 payroll-id → 12 recruitment
→ 13 assets → 14 project → 15 field service → 16 logistics → 17 marketplace → 18 support
→ 19 document → 20 finance multi-company → 21 platform (paralel)
```

## Detail spec tiap fase
Lihat `fase-00-*.md` … `fase-21-*.md` (satu file per fase — goal, tabel, deliverable, acceptance criteria untuk dipakai agent manapun).