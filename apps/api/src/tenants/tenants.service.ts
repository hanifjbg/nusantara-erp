import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AuditService } from '../common/audit';
import { DB, type Db } from '../db.provider';
import { featureFlags, tenantSettings, tenants } from '../db/schema';

export const tenantCreateSchema = z.object({
  tenantCode: z.string().min(2).max(32),
  tenantName: z.string().min(2),
  subdomain: z.string().max(64).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(32).optional(),
});

export const settingUpsertSchema = z.object({
  settingKey: z.string().min(1).max(128),
  settingValue: z.unknown(),
});

export const flagUpsertSchema = z.object({
  flagKey: z.string().min(1).max(128),
  isEnabled: z.boolean().default(true),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
});

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Tenant milik JWT — user tidak bisa intip tenant lain (isolasi level service). */
  async getOwn(tenantId: string) {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('tenant tidak ditemukan');
    return rows[0];
  }

  async create(body: unknown, actorUserId: string | null, ip: string | null) {
    const dto = tenantCreateSchema.parse(body);
    const [row] = await this.db.insert(tenants).values(dto).returning();
    await this.audit.write(row.id, actorUserId, ip, {
      entityType: 'tenants',
      entityId: row.id,
      action: 'create',
      newValues: dto,
    });
    return row;
  }

  async updateOwn(tenantId: string, body: unknown, actorUserId: string, ip: string | null) {
    const dto = tenantCreateSchema.partial().parse(body);
    const [old] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!old) throw new NotFoundException('tenant tidak ditemukan');
    const [row] = await this.db
      .update(tenants)
      .set({ ...dto, updatedAt: new Date(), updatedBy: actorUserId })
      .where(eq(tenants.id, tenantId))
      .returning();
    await this.audit.write(tenantId, actorUserId, ip, {
      entityType: 'tenants',
      entityId: tenantId,
      action: 'update',
      oldValues: old,
      newValues: row,
    });
    return row;
  }

  // ---- tenant_settings (tenant-scoped) ----
  async listSettings(tenantId: string) {
    return this.db
      .select()
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), isNull(tenantSettings.deletedAt)));
  }

  async upsertSetting(tenantId: string, body: unknown, actorUserId: string) {
    const dto = settingUpsertSchema.parse(body);
    const existing = await this.db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.settingKey, dto.settingKey),
          isNull(tenantSettings.deletedAt),
        ),
      )
      .limit(1);
    if (existing[0]) {
      const [row] = await this.db
        .update(tenantSettings)
        .set({ settingValue: dto.settingValue as never, updatedAt: new Date(), updatedBy: actorUserId })
        .where(eq(tenantSettings.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(tenantSettings)
      .values({
        tenantId,
        settingKey: dto.settingKey,
        settingValue: dto.settingValue as never,
        createdBy: actorUserId,
      })
      .returning();
    return row;
  }

  // ---- feature_flags (tenant-scoped) ----
  async listFlags(tenantId: string) {
    return this.db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.tenantId, tenantId), isNull(featureFlags.deletedAt)));
  }

  async upsertFlag(tenantId: string, body: unknown, actorUserId: string) {
    const dto = flagUpsertSchema.parse(body);
    const existing = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.tenantId, tenantId),
          eq(featureFlags.flagKey, dto.flagKey),
          isNull(featureFlags.deletedAt),
        ),
      )
      .limit(1);
    if (existing[0]) {
      const [row] = await this.db
        .update(featureFlags)
        .set({
          isEnabled: dto.isEnabled,
          rolloutPercentage: dto.rolloutPercentage,
          updatedAt: new Date(),
          updatedBy: actorUserId,
        })
        .where(eq(featureFlags.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(featureFlags)
      .values({ tenantId, ...dto, createdBy: actorUserId })
      .returning();
    return row;
  }
}
