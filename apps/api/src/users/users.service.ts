import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AuditService } from '../common/audit';
import { DB, type Db } from '../db.provider';
import { organizations, userOrganizations, userRoles, users, roles } from '../db/schema';

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'password minimal 8 karakter'),
  username: z.string().max(64).optional(),
  fullName: z.string().min(1).optional(),
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  phone: z.string().max(32).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

export const userUpdateSchema = userCreateSchema
  .omit({ email: true, password: true })
  .partial();

export const assignRoleSchema = z.object({
  roleCode: z.string().min(1),
  organizationId: z.string().uuid().optional(),
});

export const membershipSchema = z.object({
  organizationId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

const PUBLIC_FIELDS = {
  id: users.id,
  email: users.email,
  username: users.username,
  fullName: users.fullName,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
} as const;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.db
      .select(PUBLIC_FIELDS)
      .from(users)
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));
  }

  async get(tenantId: string, id: string) {
    const rows = await this.db
      .select(PUBLIC_FIELDS)
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('user tidak ditemukan');
    return rows[0];
  }

  async create(tenantId: string, body: unknown, actorUserId: string, ip: string | null) {
    const dto = userCreateSchema.parse(body);
    const dup = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, dto.email), isNull(users.deletedAt)))
      .limit(1);
    if (dup.length > 0) throw new ConflictException('email sudah terdaftar');

    const [row] = await this.db
      .insert(users)
      .values({
        tenantId,
        email: dto.email,
        passwordHash: await hash(dto.password, 10),
        username: dto.username,
        fullName: dto.fullName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status,
        createdBy: actorUserId,
      })
      .returning(PUBLIC_FIELDS);
    await this.audit.write(tenantId, actorUserId, ip, {
      entityType: 'users',
      entityId: row.id,
      action: 'create',
      newValues: { email: dto.email },
    });
    return row;
  }

  async update(tenantId: string, id: string, body: unknown, actorUserId: string, ip: string | null) {
    const dto = userUpdateSchema.parse(body);
    const old = await this.get(tenantId, id);
    const [row] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date(), updatedBy: actorUserId })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning(PUBLIC_FIELDS);
    await this.audit.write(tenantId, actorUserId, ip, {
      entityType: 'users',
      entityId: id,
      action: 'update',
      oldValues: old,
      newValues: row,
    });
    return row;
  }

  async remove(tenantId: string, id: string, actorUserId: string, ip: string | null) {
    await this.get(tenantId, id);
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedBy: actorUserId })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
    await this.audit.write(tenantId, actorUserId, ip, {
      entityType: 'users',
      entityId: id,
      action: 'delete',
    });
    return { ok: true };
  }

  /** Beri role (role harus milik tenant yang sama) ke user (user harus tenant sama). */
  async assignRole(tenantId: string, userId: string, body: unknown, actorUserId: string) {
    const dto = assignRoleSchema.parse(body);
    await this.get(tenantId, userId);
    const roleRows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.roleCode, dto.roleCode), eq(roles.tenantId, tenantId), isNull(roles.deletedAt)))
      .limit(1);
    if (!roleRows[0]) throw new NotFoundException('role tidak ditemukan di tenant ini');
    if (dto.organizationId) {
      const orgRows = await this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(and(eq(organizations.id, dto.organizationId), eq(organizations.tenantId, tenantId)))
        .limit(1);
      if (!orgRows[0]) throw new NotFoundException('organisasi tidak ditemukan di tenant ini');
    }
    await this.db
      .insert(userRoles)
      .values({
        userId,
        roleId: roleRows[0].id,
        organizationId: dto.organizationId,
        createdBy: actorUserId,
      })
      .onConflictDoNothing();
    return { ok: true };
  }

  async addMembership(tenantId: string, userId: string, body: unknown, actorUserId: string) {
    const dto = membershipSchema.parse(body);
    await this.get(tenantId, userId);
    const orgRows = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.id, dto.organizationId), eq(organizations.tenantId, tenantId)))
      .limit(1);
    if (!orgRows[0]) throw new NotFoundException('organisasi tidak ditemukan di tenant ini');
    await this.db
      .insert(userOrganizations)
      .values({
        userId,
        organizationId: dto.organizationId,
        isPrimary: dto.isPrimary,
        createdBy: actorUserId,
      })
      .onConflictDoNothing();
    return { ok: true };
  }
}
