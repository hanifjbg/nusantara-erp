// Helper pusat tenant_id (Fase 1 Architect deliverable).
// Aturan (skill tenant-isolation-rules):
// - tenant SELALU dari auth context / header tepercaya, TIDAK PERNAH dari body/params.
// - setiap query ke tabel ber-tenant_id wajib AND tenantEq(...).
// - insert selalu set tenant_id dari context; update/delete selalu AND id+tenant.
import { eq, isNull, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** Header tepercaya untuk konteks tenant (diisi gateway/auth, bukan user bebas). */
export const ACTIVE_TENANT_HEADER = 'x-tenant-id';

/** WHERE tenant_id = :tenantId — wajib dipakai di semua query tabel ber-tenant_id. */
export function tenantEq(column: PgColumn, tenantId: string): SQL {
  return eq(column, tenantId);
}

/** WHERE deleted_at IS NULL — soft-delete: baris terhapus tidak terlihat. */
export function isActive(column: PgColumn): SQL {
  return isNull(column);
}

export class MissingTenantError extends Error {
  constructor() {
    super(`konteks tenant wajib (${ACTIVE_TENANT_HEADER} / JWT tenantId)`);
    this.name = 'MissingTenantError';
  }
}

/** Ambil tenant dari context; lempar bila kosong (jangan default diam-diam). */
export function requireTenantId(tenantId: string | undefined | null): string {
  if (!tenantId) throw new MissingTenantError();
  return tenantId;
}
