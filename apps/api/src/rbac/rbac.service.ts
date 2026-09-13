import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DB, type Db } from '../db.provider';
import { syncPermissionCatalog } from '../common/access';
import { permissions, rolePermissions, roles } from '../db/schema';

export const roleCreateSchema = z.object({
  roleCode: z.string().min(2).max(64),
  roleName: z.string().min(2),
  description: z.string().max(500).optional(),
});

export const rolePermsSchema = z.object({
  permissionCodes: z.array(z.string().min(1)).min(1),
});

@Injectable()
export class RbacService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listRoles(tenantId: string) {
    return this.db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), isNull(roles.deletedAt)));
  }

  async createRole(tenantId: string, body: unknown, actorUserId: string) {
    const dto = roleCreateSchema.parse(body);
    const [row] = await this.db
      .insert(roles)
      .values({ tenantId, ...dto, createdBy: actorUserId })
      .returning();
    return row;
  }

  async listPermissions() {
    return this.db
      .select({
        permissionCode: permissions.permissionCode,
        permissionName: permissions.permissionName,
        moduleCode: permissions.moduleCode,
      })
      .from(permissions)
      .where(isNull(permissions.deletedAt));
  }

  async syncPermissions() {
    await syncPermissionCatalog(this.db);
    return this.listPermissions();
  }

  /** Ganti seluruh permission sebuah role (role harus milik tenant). */
  async setRolePermissions(tenantId: string, roleCode: string, body: unknown) {
    const dto = rolePermsSchema.parse(body);
    const roleRows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.roleCode, roleCode), eq(roles.tenantId, tenantId), isNull(roles.deletedAt)))
      .limit(1);
    if (!roleRows[0]) throw new NotFoundException('role tidak ditemukan di tenant ini');
    const roleId = roleRows[0].id;

    const permRows = await this.db
      .select({ id: permissions.id, code: permissions.permissionCode })
      .from(permissions)
      .where(isNull(permissions.deletedAt));
    const byCode = new Map(permRows.map((p) => [p.code, p.id]));
    const missing = dto.permissionCodes.filter((c) => !byCode.has(c));
    if (missing.length > 0) throw new NotFoundException(`permission tidak dikenal: ${missing.join(', ')}`);

    await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await this.db
      .insert(rolePermissions)
      .values(dto.permissionCodes.map((c) => ({ roleId, permissionId: byCode.get(c)! })));
    return { ok: true, count: dto.permissionCodes.length };
  }

  async getRolePermissions(tenantId: string, roleCode: string) {
    const roleRows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.roleCode, roleCode), eq(roles.tenantId, tenantId), isNull(roles.deletedAt)))
      .limit(1);
    if (!roleRows[0]) throw new NotFoundException('role tidak ditemukan di tenant ini');
    return this.db
      .select({ permissionCode: permissions.permissionCode })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(eq(rolePermissions.roleId, roleRows[0].id), isNull(rolePermissions.deletedAt)),
      );
  }
}
