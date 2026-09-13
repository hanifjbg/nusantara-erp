/**
 * Integration Fase 2 (butuh Postgres lokal + migration termigrate).
 * Data TEST_F2_* dibersihkan di afterAll.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from './db/client';
import {
  chartOfAccounts,
  currencies,
  customerAddresses,
  customerContacts,
  customers,
  exchangeRates,
  fiscalPeriods,
  itemCategories,
  itemVariants,
  items,
  priceListItems,
  priceLists,
  taxCodes,
  tenants,
  unitsOfMeasure,
  uomConversions,
  users,
  vendorContacts,
  vendors,
  warehouseBins,
  warehouseZones,
  warehouses,
} from './db/schema';
import { FinanceMasterService } from './master-data/finance-master.service';
import { ItemMasterService } from './master-data/item-master.service';
import { PartnerMasterService } from './master-data/partner-master.service';
import { WarehouseMasterService } from './master-data/warehouse-master.service';

const REAL_DB = !process.env.DATABASE_URL?.includes('vitest_dummy');
const SFX = Date.now().toString(36);
const code = (p: string) => `${p}_${SFX}`.slice(0, 32);
const ACTOR = '00000000-0000-0000-0000-000000000001';

describe.skipIf(!REAL_DB)('Fase 2 integration', () => {
  const finance = new FinanceMasterService(db);
  const itemSvc = new ItemMasterService(db);
  const partner = new PartnerMasterService(db);
  const wh = new WarehouseMasterService(db);

  let tenantA = '';
  let tenantB = '';

  beforeAll(async () => {
    const [a] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F2_A'), tenantName: 'Test F2 A' })
      .returning({ id: tenants.id });
    const [b] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F2_B'), tenantName: 'Test F2 B' })
      .returning({ id: tenants.id });
    tenantA = a.id;
    tenantB = b.id;
  }, 30000);

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      const pls = await db.select({ id: priceLists.id }).from(priceLists).where(eq(priceLists.tenantId, t));
      for (const p of pls) await db.delete(priceListItems).where(eq(priceListItems.priceListId, p.id));
      await db.delete(priceLists).where(eq(priceLists.tenantId, t));
      await db.delete(itemVariants).where(eq(itemVariants.tenantId, t));
      await db.delete(items).where(eq(items.tenantId, t));
      await db.delete(itemCategories).where(eq(itemCategories.tenantId, t));
      await db.delete(uomConversions).where(eq(uomConversions.tenantId, t));
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.tenantId, t));
      await db.delete(customerContacts).where(eq(customerContacts.tenantId, t));
      await db.delete(customerAddresses).where(eq(customerAddresses.tenantId, t));
      await db.delete(customers).where(eq(customers.tenantId, t));
      await db.delete(vendorContacts).where(eq(vendorContacts.tenantId, t));
      await db.delete(vendors).where(eq(vendors.tenantId, t));
      await db.delete(warehouseBins).where(eq(warehouseBins.tenantId, t));
      await db.delete(warehouseZones).where(eq(warehouseZones.tenantId, t));
      await db.delete(warehouses).where(eq(warehouses.tenantId, t));
      await db.delete(exchangeRates).where(eq(exchangeRates.tenantId, t));
      await db.delete(chartOfAccounts).where(eq(chartOfAccounts.tenantId, t));
      await db.delete(fiscalPeriods).where(eq(fiscalPeriods.tenantId, t));
      await db.delete(taxCodes).where(eq(taxCodes.tenantId, t));
      await db.delete(users).where(eq(users.tenantId, t));
      await db.delete(tenants).where(eq(tenants.id, t));
    }
  }, 30000);

  it('currencies: seed 10 ISO + idempotent', async () => {
    const first = await finance.seedCurrencies(ACTOR);
    expect(first.length).toBeGreaterThanOrEqual(10);
    const second = await finance.seedCurrencies(ACTOR);
    expect(second.length).toBe(first.length);
    expect(first.some((c) => c.currencyCode === 'IDR')).toBe(true);
  }, 30000);

  it('CoA: buat + duplikat kode ditolak', async () => {
    const acc = await finance.createCoa(tenantA, { accountCode: '1-1000', accountName: 'Kas', accountType: 'asset' }, ACTOR);
    expect(acc.id).toBeTruthy();
    await expect(
      finance.createCoa(tenantA, { accountCode: '1-1000', accountName: 'Kas 2', accountType: 'asset' }, ACTOR),
    ).rejects.toThrow();
    const list = await finance.listCoa(tenantA);
    expect(list.length).toBe(1);
  }, 30000);

  it('fiscal: buat + close', async () => {
    const p = await finance.createFiscal(
      tenantA,
      { periodName: 'FY2026', startDate: '2026-01-01', endDate: '2026-12-31' },
      ACTOR,
    );
    expect(p.isClosed).toBe(false);
    const closed = await finance.closeFiscal(tenantA, p.id);
    expect(closed.isClosed).toBe(true);
  }, 30000);

  it('fiscal: overlap ditolak', async () => {
    // FY2026 (test sebelumnya) menutup 2026 → pakai 2027 untuk uji overlap.
    await finance.createFiscal(
      tenantA,
      { periodName: 'Q1-27', startDate: '2027-01-01', endDate: '2027-03-31' },
      ACTOR,
    );
    await expect(
      finance.createFiscal(
        tenantA,
        { periodName: 'Q1-27X', startDate: '2027-03-01', endDate: '2027-06-30' },
        ACTOR,
      ),
    ).rejects.toThrow(/overlap/);
    // Tidak overlap → lolos.
    const ok = await finance.createFiscal(
      tenantA,
      { periodName: 'Q3-27', startDate: '2027-07-01', endDate: '2027-09-30' },
      ACTOR,
    );
    expect(ok.id).toBeTruthy();
  }, 30000);

  it('FX: rate + convert + pajak compute', async () => {
    await finance.createRate(
      tenantA,
      { baseCode: 'USD', targetCode: 'IDR', rate: '15850', effectiveDate: '2026-09-01' },
      ACTOR,
    );
    const c = await finance.convert(tenantA, { amount: '100', baseCode: 'USD', targetCode: 'IDR' });
    expect(c.converted).toBe('1585000.0000');
    await finance.createTax(
      tenantA,
      { taxCode: 'PPN11', taxName: 'PPN 11%', taxType: 'PPN', ratePercentage: '11', effectiveDate: '2026-01-01' },
      ACTOR,
    );
    const t = await finance.computeTax(tenantA, { base: '100000', taxCode: 'PPN11' });
    expect(t.tax).toBe('11000.0000');
    expect(t.total).toBe('111000.0000');
  }, 30000);

  it('UoM: satuan + konversi BOX→PCS', async () => {
    await itemSvc.createUom(tenantA, { uomCode: 'PCS', uomName: 'Pieces' }, ACTOR);
    await itemSvc.createUom(tenantA, { uomCode: 'BOX', uomName: 'Box' }, ACTOR);
    await itemSvc.createConversion(tenantA, { fromCode: 'BOX', toCode: 'PCS', conversionFactor: '12' }, ACTOR);
    const r = await itemSvc.convertQty(tenantA, { qty: '2', fromCode: 'BOX', toCode: 'PCS' });
    expect(r.qty).toBe('24.0000');
  }, 30000);

  it('item: kategori + item + varian + price list', async () => {
    const cat = await itemSvc.createCategory(tenantA, { categoryCode: 'EL', categoryName: 'Elektronik' }, ACTOR);
    const item = await itemSvc.createItem(
      tenantA,
      { itemCategoryId: cat.id, itemCode: 'LP-001', itemName: 'Laptop', brand: 'Nusa' },
      ACTOR,
    );
    const variant = await itemSvc.createVariant(
      tenantA,
      { itemId: item.id, variantCode: '16GB', variantName: 'RAM 16GB', additionalPrice: '1500000' },
      ACTOR,
    );
    expect(variant.id).toBeTruthy();
    const pl = await itemSvc.createPriceList(tenantA, { priceListName: 'Retail' }, ACTOR);
    const pli = await itemSvc.addPriceItem(tenantA, pl.id, { itemId: item.id, unitPrice: '12000000' }, ACTOR);
    expect(pli.unitPrice).toBe('12000000');
    const listed = await itemSvc.listPriceItems(tenantA, pl.id);
    expect(listed.length).toBe(1);
  }, 30000);

  it('isolasi: item tenant B tak terlihat dari A', async () => {
    const itemB = await itemSvc.createItem(tenantB, { itemCode: 'SECRET', itemName: 'Rahasia' }, ACTOR);
    const listA = await itemSvc.listItems(tenantA);
    expect(listA.every((i) => i.id !== itemB.id)).toBe(true);
    const pls = await itemSvc.listPriceLists(tenantA);
    await expect(itemSvc.listPriceItems(tenantB, pls[0]?.id ?? '00000000-0000-0000-0000-000000000000')).rejects.toThrow();
  }, 30000);

  it('partner: customer + kontak + vendor + kontak', async () => {
    const cust = await partner.createCustomer(
      tenantA,
      { customerCode: 'C-001', customerName: 'PT Maju', email: 'halo@maju.id' },
      ACTOR,
    );
    const cc = await partner.addContact(tenantA, cust.id, { contactName: 'Budi', isPrimary: true }, ACTOR);
    expect(cc.isPrimary).toBe(true);
    const vend = await partner.createVendor(
      tenantA,
      { vendorCode: 'V-001', vendorName: 'CV Supply' },
      ACTOR,
    );
    const vc = await partner.addVendorContact(tenantA, vend.id, { contactName: 'Siti' }, ACTOR);
    expect(vc.id).toBeTruthy();
    expect((await partner.listCustomers(tenantA)).length).toBe(1);
    expect((await partner.listVendors(tenantA)).length).toBe(1);
  }, 30000);

  it('gudang: warehouse → zone → bin + tolak lintas tenant', async () => {
    const g = await wh.createWarehouse(tenantA, { warehouseCode: 'G-JKT', warehouseName: 'Jakarta' }, ACTOR);
    const z = await wh.createZone(tenantA, { warehouseId: g.id, zoneCode: 'A', zoneName: 'Zona A' }, ACTOR);
    const b = await wh.createBin(tenantA, { zoneId: z.id, binCode: 'A-01', binName: 'Bin 01' }, ACTOR);
    expect(b.id).toBeTruthy();
    // zone milik A dipakai untuk warehouse B → harus ditolak
    const gB = await wh.createWarehouse(tenantB, { warehouseCode: 'G-BDG', warehouseName: 'Bandung' }, ACTOR);
    await expect(wh.createZone(tenantB, { warehouseId: gB.id, zoneCode: 'A', zoneName: 'Zona A' }, ACTOR)).resolves.toBeTruthy();
    await expect(wh.createBin(tenantB, { zoneId: z.id, binCode: 'X', binName: 'X' }, ACTOR)).rejects.toThrow(/tidak ditemukan/);
  }, 30000);

  it('infra: policy RLS Fase 2 terpasang (≥35 total)', async () => {
    const pol = await db.execute(`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`);
    expect((pol[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(35);
  }, 30000);
});
