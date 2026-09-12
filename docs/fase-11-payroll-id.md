# Fase 11 — Payroll Indonesia

> **Goal**: Penggajian dengan regulatory Indonesia (PPh21 & BPJS) yang benar & terverifikasi.
> **Dependency**: Fase 01, 07 (posting ke GL), 10 (employee/attendance).
> **Tabel (6)**: payroll_components, payroll_runs, employee_payslips, pph21_calculations, bpjs_kesehatan_records, bpjs_ketenagakerjaan_records

## Deliverable
- **Architect**: model payroll_component (earnings/deductions), alur payroll run → payslip, posting ke GL (via Fase 7), `domain:payroll-id`.
- **Executor**: components config (+ formula), payroll_runs (generate payslip per employee: gaji pokok, tunjangan, lembur, potongan), kalkulasi PPh21 (TER/PTKP sesuai peraturan) & BPJS (Kesehatan, JHT/JP/JKK/JKM), absah ke Fase 7 jurnal.
- **Tester**: kalkulasi payslip (bruto→netto), PPh21 correct per aturan berlaku, BPJS iuran pekerja/company, run finalisasi & lock, posting GL.
- **Validator/Security/QA**: conformity; tenant filter; **QA khusus: verifikasi PPh21 & BPJS ke sumber resmi DJP/BPJS saat itu (bukan hafalan)** — tandai referensi; privacy gaji role-based; demo payslip (screenshot, angka dibanding sumber).

## Acceptance criteria
- [ ] Run menghasilkan payslip yang matematis benar dan sesuai regulasi aktif.
- [ ] PPh21 & BPJS dihitung dari config (bukan hardcode tarif) + referensi peraturan tercatat.
- [ ] Finalisasi run: lock (tidak bisa diubah tanpa batch reversal).
- [ ] Payroll posting ke jurnal (accrual & payment).

## Dependensi
- Finance Fase 7.

## Skill
`payroll-id-rules`, `tenant-isolation-rules`, `nx-module-boundaries`.