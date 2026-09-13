import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DB, type Db } from '../db.provider';
import { warehouseBins, warehouseZones, warehouses } from '../db/schema';
import { mustOrg } from '../org/org.service';

const warehouseSchema = z.object({
  organizationId: z.string().uuid().optional(),
  warehouseCode: z.string().min(1).max(32),
  warehouseName: z.string().min(1).max(128),
  isActive: z.boolean().default(true),
});

const zoneSchema = z.object({
  warehouseId: z.string().uuid(),
  zoneCode: z.string().min(1).max(32),
  zoneName: z.string().min(1).max(128),
});

const binSchema = z.object({
  zoneId: z.string().uuid(),
  binCode: z.string().min(1).max(32),
  binName: z.string().min(1).max(128),
});

async function mustWarehouse(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId), isNull(warehouses.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('warehouse tidak ditemukan di tenant ini');
}

async function mustZone(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: warehouseZones.id })
    .from(warehouseZones)
    .where(
      and(eq(warehouseZones.id, id), eq(warehouseZones.tenantId, tenantId), isNull(warehouseZones.deletedAt)),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundException('zone tidak ditemukan di tenant ini');
}

@Injectable()
export class WarehouseMasterService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listWarehouses(tenantId: string) {
    return this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.tenantId, tenantId), isNull(warehouses.deletedAt)));
  }

  async createWarehouse(tenantId: string, body: unknown, actor: string) {
    const dto = warehouseSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(warehouses)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async listZones(tenantId: string, warehouseId?: string) {
    const conds = [eq(warehouseZones.tenantId, tenantId), isNull(warehouseZones.deletedAt)];
    if (warehouseId) {
      await mustWarehouse(this.db, tenantId, warehouseId);
      conds.push(eq(warehouseZones.warehouseId, warehouseId));
    }
    return this.db
      .select()
      .from(warehouseZones)
      .where(and(...conds));
  }

  async createZone(tenantId: string, body: unknown, actor: string) {
    const dto = zoneSchema.parse(body);
    await mustWarehouse(this.db, tenantId, dto.warehouseId);
    const [row] = await this.db
      .insert(warehouseZones)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async listBins(tenantId: string, zoneId?: string) {
    const conds = [eq(warehouseBins.tenantId, tenantId), isNull(warehouseBins.deletedAt)];
    if (zoneId) {
      await mustZone(this.db, tenantId, zoneId);
      conds.push(eq(warehouseBins.zoneId, zoneId));
    }
    return this.db
      .select()
      .from(warehouseBins)
      .where(and(...conds));
  }

  async createBin(tenantId: string, body: unknown, actor: string) {
    const dto = binSchema.parse(body);
    await mustZone(this.db, tenantId, dto.zoneId);
    const [row] = await this.db
      .insert(warehouseBins)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }
}
