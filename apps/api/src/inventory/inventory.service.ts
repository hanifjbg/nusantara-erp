import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  LotExpiredError,
  StockNegativeError,
  applyMovement,
  assertLotNotExpired,
  opnameDiff,
  type MovementType,
} from '@nusantara-erp/domain-inventory';
import { AuditService } from '../common/audit';
import { DB, type Db } from '../db.provider';
import {
  batchLots,
  items,
  serialNumbers,
  stockBalances,
  stockMovements,
  stockOpnames,
  stockTransfers,
  warehouses,
} from '../db/schema';

export const receiveSchema = z.object({
  itemId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).default(0),
  referenceType: z.string().max(64).optional(),
  referenceId: z.string().uuid().optional(),
  batchNo: z.string().max(64).optional(),
  manufacturedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  serialNos: z.array(z.string().min(1).max(64)).max(500).optional(),
});

export const issueSchema = z.object({
  itemId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().positive(),
  referenceType: z.string().max(64).optional(),
  referenceId: z.string().uuid().optional(),
  batchNo: z.string().max(64).optional(),
  serialNo: z.string().max(64).optional(),
});

export const transferSchema = z.object({
  itemId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid(),
  targetWarehouseId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const opnameCreateSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  opnameNo: z.string().max(64).optional(),
});

export const opnameCountSchema = z.object({
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        warehouseId: z.string().uuid(),
        countedQty: z.number().min(0),
        unitCost: z.number().min(0).default(0),
      }),
    )
    .min(1)
    .max(500),
});

type ReceiveDto = z.infer<typeof receiveSchema>;
type IssueDto = z.infer<typeof issueSchema>;
type TransferDto = z.infer<typeof transferSchema>;

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Q = Db | Tx;

const num = (v: string | number | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

function docNo(prefix: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `${prefix}-${ymd}-${rnd}`;
}

function toDbError(e: unknown): never {
  if (e instanceof StockNegativeError) throw new ConflictException(e.message);
  if (e instanceof LotExpiredError) throw new ConflictException(e.message);
  throw e;
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---- lookups (tenant-scoped) ----
  private async mustItem(db: Q, tenantId: string, itemId: string) {
    const rows = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.tenantId, tenantId), isNull(items.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('item tidak ditemukan di tenant ini');
  }

  private async mustWarehouse(db: Q, tenantId: string, warehouseId: string) {
    const rows = await db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, warehouseId),
          eq(warehouses.tenantId, tenantId),
          isNull(warehouses.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException('gudang tidak ditemukan di tenant ini');
  }

  /** Balance row (lock bila di transaksi) — null bila belum ada. */
  private async getBalanceRow(
    db: Q,
    tenantId: string,
    itemId: string,
    warehouseId: string,
    lock: boolean,
  ) {
    const q = db
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.tenantId, tenantId),
          eq(stockBalances.itemId, itemId),
          eq(stockBalances.warehouseId, warehouseId),
          isNull(stockBalances.deletedAt),
        ),
      )
      .limit(1);
    const rows = await (lock ? q.for('update') : q);
    return rows[0] ?? null;
  }

  private async writeBalance(
    tx: Tx,
    tenantId: string,
    itemId: string,
    warehouseId: string,
    qty: number,
    avg: number,
    actor: string,
  ) {
    const valued = qty * avg;
    const existing = await this.getBalanceRow(tx, tenantId, itemId, warehouseId, true);
    if (!existing) {
      const [row] = await tx
        .insert(stockBalances)
        .values({
          tenantId,
          itemId,
          warehouseId,
          quantity: String(qty),
          unitCost: String(avg),
          valuedCost: String(valued),
          createdBy: actor,
        } as never)
        .returning();
      return row;
    }
    const [row] = await tx
      .update(stockBalances)
      .set({
        quantity: String(qty),
        unitCost: String(avg),
        valuedCost: String(valued),
        recordedAt: new Date(),
        updatedBy: actor,
      } as never)
      .where(eq(stockBalances.id, existing.id))
      .returning();
    return row;
  }

  private async insertMovement(
    tx: Tx,
    v: {
      tenantId: string;
      itemId: string;
      warehouseId?: string | null;
      fromWarehouseId?: string | null;
      toWarehouseId?: string | null;
      batchLotId?: string | null;
      serialNumber?: string | null;
      movementType: MovementType;
      quantity: number;
      unitCost?: number | null;
      referenceType?: string | null;
      referenceId?: string | null;
      createdBy: string;
    },
  ) {
    const [row] = await tx
      .insert(stockMovements)
      .values({
        tenantId: v.tenantId,
        itemId: v.itemId,
        warehouseId: v.warehouseId ?? null,
        fromWarehouseId: v.fromWarehouseId ?? null,
        toWarehouseId: v.toWarehouseId ?? null,
        batchLotId: v.batchLotId ?? null,
        serialNumber: v.serialNumber ?? null,
        movementType: v.movementType,
        quantity: String(v.quantity),
        unitCost: v.unitCost === null || v.unitCost === undefined ? null : String(v.unitCost),
        referenceType: v.referenceType ?? null,
        referenceId: v.referenceId ?? null,
        createdBy: v.createdBy,
      } as never)
      .returning();
    return row;
  }

  // ---- reads ----
  async listBalances(tenantId: string, filter: { itemId?: string; warehouseId?: string }) {
    const conds = [eq(stockBalances.tenantId, tenantId), isNull(stockBalances.deletedAt)];
    if (filter.itemId) conds.push(eq(stockBalances.itemId, filter.itemId));
    if (filter.warehouseId) conds.push(eq(stockBalances.warehouseId, filter.warehouseId));
    return this.db
      .select()
      .from(stockBalances)
      .where(and(...conds))
      .orderBy(asc(stockBalances.recordedAt));
  }

  async listMovements(tenantId: string, filter: { itemId?: string; warehouseId?: string }) {
    const conds = [eq(stockMovements.tenantId, tenantId), isNull(stockMovements.deletedAt)];
    if (filter.itemId) conds.push(eq(stockMovements.itemId, filter.itemId));
    if (filter.warehouseId) conds.push(eq(stockMovements.warehouseId, filter.warehouseId));
    return this.db
      .select()
      .from(stockMovements)
      .where(and(...conds))
      .orderBy(asc(stockMovements.movementAt));
  }

  async listTransfers(tenantId: string) {
    return this.db
      .select()
      .from(stockTransfers)
      .where(and(eq(stockTransfers.tenantId, tenantId), isNull(stockTransfers.deletedAt)))
      .orderBy(asc(stockTransfers.createdAt));
  }

  async listOpnames(tenantId: string) {
    return this.db
      .select()
      .from(stockOpnames)
      .where(and(eq(stockOpnames.tenantId, tenantId), isNull(stockOpnames.deletedAt)))
      .orderBy(asc(stockOpnames.createdAt));
  }

  // ---- receive (masuk) ----
  async receive(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto: ReceiveDto = receiveSchema.parse(body);
    await this.mustItem(this.db, tenantId, dto.itemId);
    await this.mustWarehouse(this.db, tenantId, dto.warehouseId);

    const out = await this.db.transaction(async (tx) => {
      let lotId: string | null = null;
      if (dto.batchNo) {
        const found = await tx
          .select()
          .from(batchLots)
          .where(
            and(
              eq(batchLots.tenantId, tenantId),
              eq(batchLots.batchNo, dto.batchNo),
              isNull(batchLots.deletedAt),
            ),
          )
          .limit(1);
        if (found[0]) {
          const r = applyMovement(num(found[0].quantity), num(found[0].unitCost), dto.quantity, dto.unitCost, 'in');
          await tx
            .update(batchLots)
            .set({ quantity: String(r.qty), unitCost: String(r.avg), updatedBy: actor } as never)
            .where(eq(batchLots.id, found[0].id));
          lotId = found[0].id;
        } else {
          const [lot] = await tx
            .insert(batchLots)
            .values({
              tenantId,
              itemId: dto.itemId,
              warehouseId: dto.warehouseId,
              batchNo: dto.batchNo,
              quantity: String(dto.quantity),
              unitCost: String(dto.unitCost),
              manufacturedAt: dto.manufacturedAt ? new Date(dto.manufacturedAt) : null,
              expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
              createdBy: actor,
            } as never)
            .returning();
          lotId = lot.id;
        }
      }
      if (dto.serialNos?.length) {
        await tx.insert(serialNumbers).values(
          dto.serialNos.map((s) => ({
            tenantId,
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            serialNo: s,
            status: 'active',
            createdBy: actor,
          })) as never,
        );
      }
      const bal = await this.getBalanceRow(tx, tenantId, dto.itemId, dto.warehouseId, true);
      let next: { qty: number; avg: number };
      try {
        next = applyMovement(num(bal?.quantity), num(bal?.unitCost), dto.quantity, dto.unitCost, 'in');
      } catch (e) {
        toDbError(e);
      }
      const balance = await this.writeBalance(tx, tenantId, dto.itemId, dto.warehouseId, next!.qty, next!.avg, actor);
      const movement = await this.insertMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        warehouseId: dto.warehouseId,
        batchLotId: lotId,
        movementType: 'in',
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy: actor,
      });
      return { balance, movement, lotId };
    });

    await this.audit.write(tenantId, actor, ip, {
      entityType: 'stock_movements',
      entityId: out.movement.id,
      action: 'receive',
      newValues: { itemId: dto.itemId, quantity: dto.quantity },
    });
    return out;
  }

  // ---- issue (keluar; stok negatif dilarang) ----
  async issue(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto: IssueDto = issueSchema.parse(body);
    await this.mustItem(this.db, tenantId, dto.itemId);
    await this.mustWarehouse(this.db, tenantId, dto.warehouseId);

    const out = await this.db.transaction(async (tx) => {
      let lotId: string | null = null;
      if (dto.batchNo) {
        const found = await tx
          .select()
          .from(batchLots)
          .where(
            and(
              eq(batchLots.tenantId, tenantId),
              eq(batchLots.batchNo, dto.batchNo),
              isNull(batchLots.deletedAt),
            ),
          )
          .limit(1);
        if (!found[0]) throw new NotFoundException('batch lot tidak ditemukan di tenant ini');
        assertLotNotExpired(found[0].expiresAt as unknown as string | null);
        let r: { qty: number; avg: number };
        try {
          r = applyMovement(num(found[0].quantity), num(found[0].unitCost), dto.quantity, 0, 'out');
        } catch (e) {
          toDbError(e);
        }
        await tx
          .update(batchLots)
          .set({ quantity: String(r!.qty), updatedBy: actor } as never)
          .where(eq(batchLots.id, found[0].id));
        lotId = found[0].id;
      }
      if (dto.serialNo) {
        const found = await tx
          .select()
          .from(serialNumbers)
          .where(
            and(
              eq(serialNumbers.tenantId, tenantId),
              eq(serialNumbers.serialNo, dto.serialNo),
              isNull(serialNumbers.deletedAt),
            ),
          )
          .limit(1);
        if (!found[0] || found[0].status !== 'active' || found[0].itemId !== dto.itemId) {
          throw new ConflictException('serial tidak aktif / tidak cocok untuk item ini');
        }
        await tx
          .update(serialNumbers)
          .set({ status: 'sold', warehouseId: null, updatedBy: actor } as never)
          .where(eq(serialNumbers.id, found[0].id));
      }
      const bal = await this.getBalanceRow(tx, tenantId, dto.itemId, dto.warehouseId, true);
      let next: { qty: number; avg: number };
      try {
        next = applyMovement(num(bal?.quantity), num(bal?.unitCost), dto.quantity, 0, 'out');
      } catch (e) {
        toDbError(e);
      }
      const balance = await this.writeBalance(tx, tenantId, dto.itemId, dto.warehouseId, next!.qty, next!.avg, actor);
      const movement = await this.insertMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        warehouseId: dto.warehouseId,
        batchLotId: lotId,
        serialNumber: dto.serialNo,
        movementType: 'out',
        quantity: dto.quantity,
        unitCost: next!.avg,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy: actor,
      });
      return { balance, movement };
    }).catch((e) => {
      if (e instanceof LotExpiredError) throw new ConflictException(e.message);
      throw e;
    });

    await this.audit.write(tenantId, actor, ip, {
      entityType: 'stock_movements',
      entityId: out.movement.id,
      action: 'issue',
      newValues: { itemId: dto.itemId, quantity: dto.quantity },
    });
    return out;
  }

  // ---- transfer (atomik 2 sisi) ----
  async transfer(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto: TransferDto = transferSchema.parse(body);
    if (dto.sourceWarehouseId === dto.targetWarehouseId) {
      throw new ConflictException('gudang asal dan tujuan harus berbeda');
    }
    await this.mustItem(this.db, tenantId, dto.itemId);
    await this.mustWarehouse(this.db, tenantId, dto.sourceWarehouseId);
    await this.mustWarehouse(this.db, tenantId, dto.targetWarehouseId);

    const out = await this.db.transaction(async (tx) => {
      const src = await this.getBalanceRow(tx, tenantId, dto.itemId, dto.sourceWarehouseId, true);
      let srcNext: { qty: number; avg: number };
      try {
        srcNext = applyMovement(num(src?.quantity), num(src?.unitCost), dto.quantity, 0, 'out');
      } catch (e) {
        toDbError(e);
      }
      const dst = await this.getBalanceRow(tx, tenantId, dto.itemId, dto.targetWarehouseId, true);
      const dstNext = applyMovement(num(dst?.quantity), num(dst?.unitCost), dto.quantity, srcNext!.avg, 'in');

      const [doc] = await tx
        .insert(stockTransfers)
        .values({
          tenantId,
          sourceWarehouseId: dto.sourceWarehouseId,
          targetWarehouseId: dto.targetWarehouseId,
          transferNo: docNo('TRF'),
          status: 'completed',
          completedAt: new Date(),
          createdBy: actor,
        } as never)
        .returning();

      await this.writeBalance(tx, tenantId, dto.itemId, dto.sourceWarehouseId, srcNext!.qty, srcNext!.avg, actor);
      await this.writeBalance(tx, tenantId, dto.itemId, dto.targetWarehouseId, dstNext.qty, dstNext.avg, actor);
      const mOut = await this.insertMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        fromWarehouseId: dto.sourceWarehouseId,
        movementType: 'transfer_out',
        quantity: dto.quantity,
        unitCost: srcNext!.avg,
        referenceType: 'stock_transfers',
        referenceId: doc.id,
        createdBy: actor,
      });
      const mIn = await this.insertMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        toWarehouseId: dto.targetWarehouseId,
        movementType: 'transfer_in',
        quantity: dto.quantity,
        unitCost: srcNext!.avg,
        referenceType: 'stock_transfers',
        referenceId: doc.id,
        createdBy: actor,
      });
      return { transfer: doc, out: mOut, in: mIn };
    });

    await this.audit.write(tenantId, actor, ip, {
      entityType: 'stock_transfers',
      entityId: out.transfer.id,
      action: 'transfer',
      newValues: { transferNo: out.transfer.transferNo, quantity: dto.quantity },
    });
    return out;
  }

  // ---- opname ----
  async createOpname(tenantId: string, body: unknown, actor: string) {
    const dto = opnameCreateSchema.parse(body);
    if (dto.warehouseId) await this.mustWarehouse(this.db, tenantId, dto.warehouseId);
    const [row] = await this.db
      .insert(stockOpnames)
      .values({
        tenantId,
        warehouseId: dto.warehouseId ?? null,
        opnameNo: dto.opnameNo ?? docNo('OPN'),
        createdBy: actor,
      } as never)
      .returning();
    return row;
  }

  private async mustOpname(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(stockOpnames)
      .where(
        and(eq(stockOpnames.id, id), eq(stockOpnames.tenantId, tenantId), isNull(stockOpnames.deletedAt)),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException('opname tidak ditemukan di tenant ini');
    return rows[0];
  }

  async countOpname(tenantId: string, id: string, body: unknown, actor: string, ip: string | null) {
    const dto = opnameCountSchema.parse(body);
    const doc = await this.mustOpname(tenantId, id);
    if (doc.status !== 'pending') throw new ConflictException(`opname sudah ${doc.status}`);

    const movements = await this.db.transaction(async (tx) => {
      const rows = [];
      for (const line of dto.lines) {
        await this.mustItem(tx, tenantId, line.itemId);
        await this.mustWarehouse(tx, tenantId, line.warehouseId);
        const bal = await this.getBalanceRow(tx, tenantId, line.itemId, line.warehouseId, true);
        const diff = opnameDiff(num(bal?.quantity), line.countedQty);
        if (!diff.direction) continue;
        let next: { qty: number; avg: number };
        try {
          next =
            diff.direction === 'in'
              ? applyMovement(num(bal?.quantity), num(bal?.unitCost), diff.qty, line.unitCost, 'in')
              : applyMovement(num(bal?.quantity), num(bal?.unitCost), diff.qty, 0, 'out');
        } catch (e) {
          toDbError(e);
        }
        await this.writeBalance(tx, tenantId, line.itemId, line.warehouseId, next!.qty, next!.avg, actor);
        rows.push(
          await this.insertMovement(tx, {
            tenantId,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            movementType: diff.direction === 'in' ? 'opname_in' : 'opname_out',
            quantity: diff.qty,
            unitCost: next!.avg,
            referenceType: 'stock_opnames',
            referenceId: doc.id,
            createdBy: actor,
          }),
        );
      }
      await tx
        .update(stockOpnames)
        .set({ status: 'counted', countedAt: new Date(), updatedBy: actor } as never)
        .where(eq(stockOpnames.id, doc.id));
      return rows;
    });

    await this.audit.write(tenantId, actor, ip, {
      entityType: 'stock_opnames',
      entityId: doc.id,
      action: 'count',
      newValues: { lines: movements.length },
    });
    return { opnameId: doc.id, movements };
  }

  async approveOpname(tenantId: string, id: string, actor: string) {
    const doc = await this.mustOpname(tenantId, id);
    if (doc.status !== 'counted') throw new ConflictException(`opname berstatus ${doc.status}, belum bisa approve`);
    const [row] = await this.db
      .update(stockOpnames)
      .set({ status: 'completed', approvedAt: new Date(), updatedBy: actor } as never)
      .where(eq(stockOpnames.id, doc.id))
      .returning();
    return row;
  }

  // ---- partisi (dipanggil manual / scheduler Fase 21) ----
  async ensurePartitions() {
    const now = new Date();
    const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nxt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const tag = (d: Date) =>
      `stock_movements_p${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const ensured: string[] = [tag(cur), tag(nxt)];
    await this.db.execute(
      sql.raw(
        `CREATE TABLE IF NOT EXISTS ${tag(cur)} PARTITION OF stock_movements FOR VALUES FROM ('${fmt(cur)}') TO ('${fmt(nxt)}')`,
      ),
    );
    const res = (await this.db.execute(
      sql.raw(`SELECT ensure_next_month_partition('stock_movements') AS p`),
    )) as unknown as Array<{ p: string }>;
    ensured.push(res[0]?.p ?? 'unknown');
    return { ensured };
  }
}
