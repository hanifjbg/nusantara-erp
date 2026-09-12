---
name: shadcn-base
description: Design System nusantara-erp — primitive layer Base UI, komponen di libs/shared/ui, design token Tailwind v4. GUNAKAN saat menambahkan/menggunakan komponen UI: pastikan reuse dari shared/ui, menarik via shadcn MCP, bukan mengarang sendiri.
---

# Shadcn / Base UI Design System

Fondasi composition untuk seluruh frontend (Bagian 3.1 blueprint). Ditetapkan di Fase 0 oleh Architect — jangan menyimpang tanpa koordinasi.

## Sumber komponen
1. **MCP shadcn** (`@jpisnice/shadcn-ui-mcp-server --ui-library base`) — cara RESMI menarik komponen asli ke repo. Jangan mengarang API "mirip-mirip".
2. Komponen baru yang generik (atoms/molecules: Button, Input, DataTable, Select, Dialog, dsb) → `libs/shared/ui` (`pnpm dlx shadcn@latest add <name>` di app web dengan alias konfig komponen.json → lib).
3. Fungsi util bersama (`cn`, tailwind-merge) sudah ada di `libs/shared/ui/src/lib/utils.ts` — pakai itu (bukan salinan sendiri).

## Mapping atomic design
- Atoms/molecules generik → `libs/shared/ui/src/components/ui`
- Organisms/templates spesifik domain (SalesOrderForm, PayslipTable) → ikut lib domain, BUKAN di shared/ui.

## Design token
- Warna/spacing/radius/typography lewat Tailwind v4 `@theme` + `components.json`.
- Jangan hardcode hex/unit di komponen — pakai token (skip silly colors; 0 hex di komponen).
- Dark mode via `@custom-variant dark` + class strategi.

## Aturan bagi agent
1. Sebelum buat komponen baru, Cek dulu `libs/shared/ui/src/components/ui/` apa sudah ada. Ada → reuse.
2. Komponen multiuse baru → `shadcn add` via MCP (bene) supaya source asli & konsisten.
3. Bila dipaksa buat manual, ikuti pola komponen yang ada (variant CVA, `cn`, slot/a11y) — lalu beri tahu Architect untuk ditambahkan ke kit.

## Verifikasi (Validator/QA)
- Komponen baru = pakai `shared/ui` yang ada, bukan bikin ulang.
- 0 hex hardcoded di komponen (semua CSS token).
- Brand: 0 kemunculan 'admina'.

## Referensi
`libs/shared/ui/src`, `AGENTS.md`, `docs/00-architecture.md` (design system).