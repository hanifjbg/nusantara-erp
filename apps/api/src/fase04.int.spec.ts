/**
 * Integration Fase 4 (butuh Postgres lokal). Data TEST_F4_* dibersihkan di afterAll.
 * Menerima: moving-average, larangan stok negatif, transfer atomik 2 sisi,
 * opname pending→counted→completed, serial/batch tracking, isolasi tenant, RLS.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from './common/audit';
import { db } from './db/client';
import {
  batchLots,
  items,
  serialNumbers,
  stockBalances,
  stockMovements,
  stockOpnames,
  stockTransfers,
  tenants,
  warehouses,
} from './db/schema';
import { InventoryService } from './inventory/inventory.service';

const REAL_DB = !process.env.DATABASE_URL?.includes('vitest_dummy');
const SFX = Date.now().toString(36);
const code = (p: string) => `${p}_${SFX}`.slice(0, 32);
const ACTOR = '00000000-0000-0000-0000-000000000004';

describe.skipIf(!REAL_DB)('Fase 4 integration', () => {
  const inv = new InventoryService(db, new AuditService(db));

  let tenantA = '';
  let tenantB = '';
  let itemA = '';
  let wh1 = '';
  let wh2 = '';

  const bal = async (itemId: string, wh: string) => {
    const rows = await db
      .select()
      .from(stockBalances)
      .where(eq(stockBalances.itemId, itemId));
    return rows.find((r) => r.warehouseId === wh) ?? null;
  };

  beforeAll(async () => {
    const [a] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F4_A'), tenantName: 'Test F4 A' })
      .returning({ id: tenants.id });
    const [b] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F4_B'), tenantName: 'Test F4 B' })
      .returning({ id: tenants.id });
    tenantA = a.id;
    tenantB = b.id;

    const [it] = await db
      .insert(items)
      .values({ tenantId: tenantA, itemCode: code('BRG'), itemName: 'Barang Uji' })
      .returning({ id: items.id });
    itemA = it.id;
    const [w1] = await db
      .insert(warehouses)
      .values({ tenantId: tenantA, warehouseCode: code('WH1'), warehouseName: 'Gudang 1' })
      .returning({ id: warehouses.id });
    const [w2] = await db
      .insert(warehouses)
      .values({ tenantId: tenantA, warehouseCode: code('WH2'), warehouseName: 'Gudang 2' })
      .returning({ id: warehouses.id });
    wh1 = w1.id;
    wh2 = w2.id;
  }, 30000);

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      await db.delete(stockMovements).where(eq(stockMovements.tenantId, t));
      await db.delete(stockBalances).where(eq(stockBalances.tenantId, t));
      await db.delete(stockTransfers).where(eq(stockTransfers.tenantId, t));
      await db.delete(stockOpnames).where(eq(stockOpnames.tenantId, t));
      await db.delete(serialNumbers).where(eq(serialNumbers.tenantId, t));
      await db.delete(batchLots).where(eq(batchLots.tenantId, t));
      await db.delete(items).where(eq(items.tenantId, t));
      await db.delete(warehouses).where(eq(warehouses.tenantId, t));
      await db.delete(tenants).where(eq(tenants.id, t));
    }
  }, 30000);

  it('receive: moving-average 100@100 + 100@200 → 200@150', async () => {
    await inv.receive(tenantA, { itemId: itemA, warehouseId: wh1, quantity: 100, unitCost: 100 }, ACTOR, null);
    const r = await inv.receive(tenantA, { itemId: itemA, warehouseId: wh1, quantity: 100, unitCost: 200 }, ACTOR, null);
    expect(Number(r.balance.quantity)).toBe(200);
    expect(Number(r.balance.unitCost)).toBe(150);
    expect(Number(r.balance.valuedCost)).toBe(30000);
  }, 30000);

  it('issue: kurang stok + tolak over-issue (STOCK_NEGATIVE)', async () => {
    const r = await inv.issue(tenantA, { itemId: itemA, warehouseId: wh1, quantity: 50 }, ACTOR, null);
    expect(Number(r.balance.quantity)).toBe(150);
    expect(Number(r.balance.unitCost)).toBe(150); // avg tetap saat keluar
    await expect(
      inv.issue(tenantA, { itemId: itemA, warehouseId: wh1, quantity: 9999 }, ACTOR, null),
    ).rejects.toThrow(/STOCK_NEGATIVE/);
    expect(Number((await bal(itemA, wh1))?.quantity)).toBe(150); // gagal = tidak berubah
  }, 30000);

  it('transfer atomik: 30 WH1→WH2 (out+in + balance 2 sisi)', async () => {
    const r = await inv.transfer(
      tenantA,
      { itemId: itemA, sourceWarehouseId: wh1, targetWarehouseId: wh2, quantity: 30 },
      ACTOR,
      null,
    );
    expect(r.transfer.status).toBe('completed');
    expect(r.transfer.transferNo).toMatch(/^TRF-/);
    expect(Number((await bal(itemA, wh1))?.quantity)).toBe(120);
    expect(Number((await bal(itemA, wh2))?.quantity)).toBe(30);
    const moves = await inv.listMovements(tenantA, { itemId: itemA });
    const types = moves.map((m) => m.movementType);
    expect(types).toContain('transfer_out');
    expect(types).toContain('transfer_in');
    await expect(
      inv.transfer(tenantA, { itemId: itemA, sourceWarehouseId: wh1, targetWarehouseId: wh1, quantity: 1 }, ACTOR, null),
    ).rejects.toThrow(/berbeda/);
  }, 30000);

  it('opname: tercatat 120, dihitung 125 → opname_in 5 + flow completed', async () => {
    const doc = await inv.createOpname(tenantA, { warehouseId: wh1 }, ACTOR);
    expect(doc.status).toBe('pending');
    const counted = await inv.countOpname(
      tenantA,
      doc.id,
      { lines: [{ itemId: itemA, warehouseId: wh1, countedQty: 125, unitCost: 150 }] },
      ACTOR,
      null,
    );
    expect(counted.movements).toHaveLength(1);
    expect(counted.movements[0].movementType).toBe('opname_in');
    expect(Number((await bal(itemA, wh1))?.quantity)).toBe(125);
    const done = await inv.approveOpname(tenantA, doc.id, ACTOR);
    expect(done.status).toBe('completed');
    await expect(inv.countOpname(tenantA, doc.id, { lines: [] }, ACTOR, null)).rejects.toThrow();
  }, 30000);

  it('serial/batch: receive lot+serial → issue serial (sold) + tolak lot kedaluwarsa', async () => {
    const lotNo = code('LOT');
    await inv.receive(
      tenantA,
      {
        itemId: itemA,
        warehouseId: wh2,
        quantity: 10,
        unitCost: 50,
        batchNo: lotNo,
        expiresAt: '2030-01-01T00:00:00Z',
        serialNos: [`${code('SN')}-1`, `${code('SN')}-2`],
      },
      ACTOR,
      null,
    );
    const lots = await db.select().from(batchLots).where(eq(batchLots.tenantId, tenantA));
    expect(lots.some((l) => l.batchNo === lotNo && Number(l.quantity) === 10)).toBe(true);

    const serial = `${code('SN')}-1`;
    await inv.issue(tenantA, { itemId: itemA, warehouseId: wh2, quantity: 1, serialNo: serial }, ACTOR, null);
    const sn = await db.select().from(serialNumbers).where(eq(serialNumbers.tenantId, tenantA));
    expect(sn.find((s) => s.serialNo === serial)?.status).toBe('sold');
    // serial terpakai tidak bisa keluar lagi
    await expect(
      inv.issue(tenantA, { itemId: itemA, warehouseId: wh2, quantity: 1, serialNo: serial }, ACTOR, null),
    ).rejects.toThrow(/serial/);

    const expLot = code('EXP');
    await inv.receive(
      tenantA,
      { itemId: itemA, warehouseId: wh2, quantity: 5, unitCost: 10, batchNo: expLot, expiresAt: '2020-01-01T00:00:00Z' },
      ACTOR,
      null,
    );
    await expect(
      inv.issue(tenantA, { itemId: itemA, warehouseId: wh2, quantity: 1, batchNo: expLot }, ACTOR, null),
    ).rejects.toThrow(/LOT_EXPIRED/);
  }, 30000);

  it('isolasi: item tenant A tak bisa dipakai tenant B', async () => {
    await expect(
      inv.receive(tenantB, { itemId: itemA, warehouseId: wh1, quantity: 1 }, ACTOR, null),
    ).rejects.toThrow(/tidak ditemukan/);
    const listB = await inv.listBalances(tenantB, {});
    expect(listB).toHaveLength(0);
  }, 30000);

  it('infra: RLS inventory ada (≥45 policy) + partisi ter-ensure', async () => {
    const pol = await db.execute(`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`);
    expect((pol[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(45);
    const parts = await db.execute(
      `SELECT tablename FROM pg_tables WHERE tablename LIKE 'stock_movements_p%'`,
    );
    expect((parts as unknown as Array<unknown>).length).toBeGreaterThanOrEqual(3);
    const ens = await inv.ensurePartitions();
    expect(ens.ensured.length).toBeGreaterThanOrEqual(2);
  }, 30000);
});
