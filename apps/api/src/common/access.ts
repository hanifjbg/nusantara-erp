import { and, eq, isNull } from 'drizzle-orm';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '../db/schema';
import type { Db } from '../db.provider';

/** Katalog permission global Fase 1 (di-sync ke tabel permissions saat bootstrap). */
export const PERMISSION_CATALOG: Array<{ code: string; name: string; module: string }> = [
  { code: 'tenants.create', name: 'Buat tenant', module: 'tenants' },
  { code: 'tenants.read', name: 'Lihat tenant', module: 'tenants' },
  { code: 'tenants.update', name: 'Ubah tenant', module: 'tenants' },
  { code: 'users.create', name: 'Buat user', module: 'users' },
  { code: 'users.read', name: 'Lihat user', module: 'users' },
  { code: 'users.update', name: 'Ubah user', module: 'users' },
  { code: 'users.delete', name: 'Hapus user', module: 'users' },
  { code: 'roles.manage', name: 'Kelola roles', module: 'rbac' },
  { code: 'permissions.read', name: 'Lihat permissions', module: 'rbac' },
  { code: 'org.create', name: 'Buat organisasi', module: 'org' },
  { code: 'org.read', name: 'Lihat organisasi', module: 'org' },
  { code: 'org.update', name: 'Ubah organisasi', module: 'org' },
  { code: 'branches.manage', name: 'Kelola cabang', module: 'org' },
  { code: 'departments.manage', name: 'Kelola departemen', module: 'org' },
  { code: 'geo.read', name: 'Lihat wilayah', module: 'geo' },
  { code: 'addresses.manage', name: 'Kelola alamat', module: 'geo' },
  { code: 'numbering.manage', name: 'Kelola nomor dokumen', module: 'system' },
  { code: 'numbering.use', name: 'Pakai nomor dokumen', module: 'system' },
  { code: 'audit.read', name: 'Lihat audit log', module: 'system' },
  { code: 'customfields.manage', name: 'Kelola custom fields', module: 'system' },
  { code: 'flags.manage', name: 'Kelola feature flags', module: 'system' },
  { code: 'masterdata.read', name: 'Lihat master data', module: 'master-data' },
  { code: 'currencies.manage', name: 'Kelola mata uang', module: 'master-data' },
  { code: 'fx.manage', name: 'Kelola kurs', module: 'master-data' },
  { code: 'coa.manage', name: 'Kelola chart of accounts', module: 'master-data' },
  { code: 'fiscal.manage', name: 'Kelola periode fiskal', module: 'master-data' },
  { code: 'tax.manage', name: 'Kelola pajak', module: 'master-data' },
  { code: 'uom.manage', name: 'Kelola satuan', module: 'master-data' },
  { code: 'items.manage', name: 'Kelola items', module: 'master-data' },
  { code: 'pricing.manage', name: 'Kelola price list', module: 'master-data' },
  { code: 'customers.manage', name: 'Kelola customers', module: 'master-data' },
  { code: 'vendors.manage', name: 'Kelola vendors', module: 'master-data' },
  { code: 'warehouses.manage', name: 'Kelola gudang', module: 'master-data' },
  { code: 'workflow.read', name: 'Lihat workflow', module: 'workflow' },
  { code: 'workflow.manage', name: 'Kelola definisi workflow', module: 'workflow' },
  { code: 'workflow.approve', name: 'Approve workflow', module: 'workflow' },
];

/** Idempotent: insert permission katalog yang belum ada. */
export async function syncPermissionCatalog(db: Db): Promise<void> {
  const existing = await db
    .select({ code: permissions.permissionCode })
    .from(permissions)
    .where(isNull(permissions.deletedAt));
  const have = new Set(existing.map((r) => r.code));
  const missing = PERMISSION_CATALOG.filter((p) => !have.has(p.code));
  if (missing.length === 0) return;
  await db.insert(permissions).values(
    missing.map((p) => ({
      permissionCode: p.code,
      permissionName: p.name,
      moduleCode: p.module,
    })),
  );
}

/** Permission efektif user dalam satu tenant (via user_roles → roles → permissions). */
export async function resolvePermissions(
  db: Db,
  userId: string,
  tenantId: string,
): Promise<string[]> {
  const rows = await db
    .select({ code: permissions.permissionCode })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        isNull(userRoles.deletedAt),
        eq(roles.tenantId, tenantId),
        isNull(roles.deletedAt),
        isNull(rolePermissions.deletedAt),
        isNull(permissions.deletedAt),
      ),
    );
  return [...new Set(rows.map((r) => r.code))];
}
