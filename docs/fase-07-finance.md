# Fase 07 — Finance Inti (GL + AR/AP + Pajak)

> **Goal**: Menutup siklus Sales/Procurement ke pembukuan — jurnal, AR/AP, bank, pajak.
> **Dependency**: Fase 01, 02 (COA, tax_codes), 05, 06.
> **Tabel (20)**: journal_entries, journal_entry_lines, budgets, budget_lines, budget_revisions, cost_pools, cost_allocations, banks, bank_accounts, bank_transactions, bank_reconciliations, ar_invoices, ar_receipts, ar_receipt_allocations, ap_invoices, ap_payments, ap_payment_allocations, tax_invoices, tax_returns, withholding_tax_records

## Deliverable
- **Architect**: model jurnal (balanced, double-entry), alur AR/AP/allocations, kontrak OpenAPI, `domain:finance`.
- **Executor**: journal entry CRUD dengan pengecekan balance & posting (DRAFT→POSTED, unpost), AR (invoice→receipt→allocation), AP (invoice→payment→allocation), bank & reconciliation, budgets + revisions & alokasi, tax: tax_invoices, tax_returns, withholding.
- **Tester**: double entry balance, void/unpost reversal, allocation (partial/full, multi invoice), reconciliation matching, budget vs actual, pajak per tax_code + withholding calculation.
- **Validator/Security/QA**: conformity (kolom & relasi); tenant filter; role finance vs approver; demo alur invoicing–payment–reconciliation (screenshot).

## Acceptance criteria
- [ ] Jurnal selalu balanced; posting memblokir edit; reversal benar (bukan delete).
- [ ] AR/AP: invoice (nett+tax), receipts/payment, allocation sisa saldo.
- [ ] Bank reconciliation cocok (statement vs transaksi).
- [ ] Pajak: tax_invoices, tax_returns akurat sesuai tax_codes; withholding tercatat.
- [ ] Budget vs actual tersedia per period.

## Dependensi
- Dipakai Fase 8 (POS posting), 11 (payroll posting), 13 (depresiasi).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, (financial calc check di review).