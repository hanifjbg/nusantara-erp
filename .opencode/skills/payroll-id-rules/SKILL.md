---
name: payroll-id-rules
description: Referensi regulasi payroll Indonesia (PPh21 & BPJS) untuk Fase 11 nusantara-erp. WAJIB diverifikasi ke sumber resmi DJP/BPJS saat implementasi — jangan andalkan hafalan model. GUNAKAN saat membangun/meriviu modul payroll.
---

# Payroll ID Rules (Fase 11)

Modul payroll Indonesia bergantung pada regulasi yang **sering berubah**. Regulasi berikut wajib diverifikasi ulang ke sumber resmi saat implementasi (tahun berjalan), bukan dari memori:

## Sumber otoritatif
- **DJP (pajak)**: Peraturan PER-16/PJ/2016 (PPh21), PPh 21 TER (PP 58/2023 + PMK 168/2023), tarif progresif Pasal 17 UU PPh (multitier setelah TER), PTKP TER.
- **BPJS**: Kesehatan (UU 40/2004 → aturan terbaru, iuran KK/BU/pekerja), Ketenagakerjaan (PP 49/2014; iuran JHT 5.7%, JP 3%, JKK/JKM skala). Besaran iuran & ceiling gaji berubah berkala.
- **Lapor**: jadwal pelaporan SPT Masa PPh21, iuran BPJS (deadline berkala).

## Struktur data (dari schema)
- `payroll_components` (komponen pendapatan/potongan), `payroll_runs`, `employee_payslips`, `pph21_calculations`, `bpjs_kesehatan_records`, `bpjs_ketenagakerjaan_records`.

## Aturan implementasi
1. **Jangan hardcode tarif/iuran** di kode permanen — sediakan sebagai data/konfigurasi yang bisa diverifikasi & diperbarui (referensi `payroll_components`/tabel ref).
2. Tiap angka tarif diberi `source` + `effective_from` + referensi peraturan.
3. Hitung dengan **kehati-hatian attributable**: PPh21 TER bulanan; BPJS Kesehatan: iuran pekerja 1%, perusahaan 4% (verify terbaru). Ketenagakerjaan JHT 2%+3.7%, JP 1%+2% (verify).
4. Bulatkan sesuai ketentuan (rupiah penuh, metode yang benar).
5. **QA wajib** mencocokkan hasil kalkulasi dengan tabel dari sumber resmi (bukan self-report) + tandai ref tertulis di laporan.

## Anti-pattern
- Meng-klaim "sesuai PPh21" tanpa referensi peraturan.
- Tarif & keabadian hardcode.

## Referensi
`docs/fase-11-payroll-id.md`, `schema_nusantara.json`, persona `qa.md` (Fase 11).