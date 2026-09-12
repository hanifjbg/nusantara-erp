# Fase 20 — Finance Lanjutan (Multi-company)

> **Goal**: Transaksi & rekonsiliasi antar-perusahaan (konsolidasi).
> **Dependency**: Fase 01 (org), Fase 07 (multi-org COA/GL).
> **Tabel (3)**: intercompany_transactions, intercompany_reconciliations, intercompany_eliminations

## Deliverable
- **Architect**: model IC (transaksi antar org, eliminasi), `domain:finance` lanjutan.
- **Executor**: intercompany_transactions (debit/kredit antar org dengan duplikasi ke dua GL), reconciliations (match IC), eliminations (untuk laporan konsolidasi).
- **Tester**: keseimbangan IC, eliminasi laporan, mismatch detection.
- **Validator/Security/QA**: conformity; tenant (org) isolation; demo (screenshot).

## Acceptance criteria
- [ ] IC transaksi post ke dua GL simetris.
- [ ] Rekon IC mismatch terdeteksi.
- [ ] Eliminasi benar di consol report.

## Dependensi
- Finance Fase 7 solid.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.