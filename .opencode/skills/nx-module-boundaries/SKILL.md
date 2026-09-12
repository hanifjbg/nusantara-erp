---
name: nx-module-boundaries
description: Cara Executor/Architect mengakses lib Nx lain di nusantara-erp — hanya lewat public API index.ts, enforce-module-boundaries. GUNAKAN saat membuat/import antar lib di monorepo.
---

# Nx Module Boundaries

Pagar utama agar agent paralel tidak saling tabrak: **akses lintas lib hanya lewat public API (`index.ts`)**, ditegakkan oleh `enforce-module-boundaries` (tags `domain:<name>`).

## Aturan
1. Setiap lib punya tag: `domain:<nama>` (mis. `domain:inventory`); `shared` tag `domain:shared`; ui lib pakai tag akses melalui dependencies di `nx.json` + `eslint` boundary.
2. Import dari lib lain: **hanya** `import { x } from '@nusantara-erp/inventory'` (bukan `../inventory/src/private-file`).
3. Internal file tidak boleh di-export di `index.ts` kecuali memang public API (service/entity/DTO yang dipakai lintas domain).
4. Domain yang tidak boleh diimpor ke domain A (mis. `domain:pos` belum boleh dipakai `domain:finance`) diatur via `./../.. eslint-plugin` deps map di `nx.json`/`eslint.config`. Ikuti map saat tagging.

## Jika butuh akses internal
- Add ke public API index (jika memang konsumsi cross-domain) → update boundary deps map → `npx nx graph`.
- Jangan menambal dengan `// eslint-disable-next-line nx/enforce-module-boundaries`.

## Verifikasi
`npx nx lint <project>` harus 0 error boundary. `nx affected:lint` di CI.

## Referensi
`AGENTS.md`, `tsconfig.base.json` paths, `eslint.config.mjs` (rules dari `@nx/eslint-plugin`).