// E2E Fase 2: bootstrap → master data penuh → negatif RBAC.
// Prasyarat: DB bersih dari E2E (lihat scripts/e2e-fase02-cleanup.sql). API di :3102.
const BASE = 'http://localhost:3102';
const SFX = Date.now().toString(36);
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
};

const boot = await (await fetch(`${BASE}/auth/bootstrap`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    tenantCode: `E2B_${SFX}`.slice(0, 12), tenantName: 'E2B Corp',
    orgCode: 'HQ', orgName: 'Head Office',
    adminEmail: `boss-${SFX}@e2b.id`, adminPassword: 'Rahasia123', adminName: 'Boss',
  }),
})).json();
check('bootstrap', !!(boot.accessToken && boot.refreshToken), JSON.stringify(boot).slice(0, 120));
const A = { Authorization: `Bearer ${boot.accessToken}`, 'content-type': 'application/json' };

const seed = await (await fetch(`${BASE}/master/currencies/seed`, { method: 'POST', headers: A })).json();
check('seed 10 kurs ISO', Array.isArray(seed) && seed.length >= 10, `n=${seed?.length}`);

const dup = await (await fetch(`${BASE}/master/currencies/seed`, { method: 'POST', headers: A })).json();
check('seed idempotent', dup.length === seed.length, `n=${dup?.length}`);

const coa = await (await fetch(`${BASE}/master/chart-of-accounts`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ accountCode: '1-1000', accountName: 'Kas', accountType: 'asset' }),
})).json();
check('CoA', !!coa.id, JSON.stringify(coa).slice(0, 100));
const coaDup = await fetch(`${BASE}/master/chart-of-accounts`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ accountCode: '1-1000', accountName: 'Kas 2', accountType: 'asset' }),
});
check('CoA duplikat → 409', coaDup.status === 409, `status=${coaDup.status}`);

const fp = await (await fetch(`${BASE}/master/fiscal-periods`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ periodName: 'FY2026', startDate: '2026-01-01', endDate: '2026-12-31' }),
})).json();
check('periode fiskal', !!fp.id, JSON.stringify(fp).slice(0, 100));
const closed = await (await fetch(`${BASE}/master/fiscal-periods/${fp.id}/close`, { method: 'PATCH', headers: A })).json();
check('close periode', closed.isClosed === true, JSON.stringify(closed).slice(0, 100));

await fetch(`${BASE}/master/exchange-rates`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ baseCode: 'USD', targetCode: 'IDR', rate: '15850', effectiveDate: '2026-09-01' }),
});
const fx = await (await fetch(`${BASE}/master/exchange-rates/convert`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ amount: '100', baseCode: 'USD', targetCode: 'IDR' }),
})).json();
check('FX convert', fx.converted === '1585000.0000', JSON.stringify(fx));

await fetch(`${BASE}/master/tax-codes`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ taxCode: 'PPN11', taxName: 'PPN 11%', taxType: 'PPN', ratePercentage: '11', effectiveDate: '2026-01-01' }),
});
const tax = await (await fetch(`${BASE}/master/tax-codes/compute`, {
  method: 'POST', headers: A, body: JSON.stringify({ base: '100000', taxCode: 'PPN11' }),
})).json();
check('pajak compute', tax.tax === '11000.0000' && tax.total === '111000.0000', JSON.stringify(tax));

for (const u of [{ uomCode: 'PCS', uomName: 'Pieces' }, { uomCode: 'BOX', uomName: 'Box' }]) {
  await fetch(`${BASE}/master/uoms`, { method: 'POST', headers: A, body: JSON.stringify(u) });
}
await fetch(`${BASE}/master/uom-conversions`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ fromCode: 'BOX', toCode: 'PCS', conversionFactor: '12' }),
});
const cv = await (await fetch(`${BASE}/master/uom-conversions/convert`, {
  method: 'POST', headers: A, body: JSON.stringify({ qty: '2', fromCode: 'BOX', toCode: 'PCS' }),
})).json();
check('UoM convert 2 BOX → 24', cv.qty === '24.0000', JSON.stringify(cv));

const cat = await (await fetch(`${BASE}/master/item-categories`, {
  method: 'POST', headers: A, body: JSON.stringify({ categoryCode: 'EL', categoryName: 'Elektronik' }),
})).json();
const item = await (await fetch(`${BASE}/master/items`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ itemCategoryId: cat.id, itemCode: 'LP-001', itemName: 'Laptop', brand: 'Nusa' }),
})).json();
check('item', !!item.id, JSON.stringify(item).slice(0, 100));
const variant = await (await fetch(`${BASE}/master/item-variants`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ itemId: item.id, variantCode: '16GB', variantName: 'RAM 16GB', additionalPrice: '1500000' }),
})).json();
check('varian', !!variant.id, JSON.stringify(variant).slice(0, 100));
const pl = await (await fetch(`${BASE}/master/price-lists`, {
  method: 'POST', headers: A, body: JSON.stringify({ priceListName: 'Retail' }),
})).json();
const pli = await (await fetch(`${BASE}/master/price-lists/${pl.id}/items`, {
  method: 'POST', headers: A, body: JSON.stringify({ itemId: item.id, unitPrice: '12000000' }),
})).json();
check('price item', pli.unitPrice === '12000000', JSON.stringify(pli).slice(0, 100));

const cust = await (await fetch(`${BASE}/master/customers`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ customerCode: 'C-001', customerName: 'PT Maju', email: 'halo@maju.id' }),
})).json();
check('customer', !!cust.id, JSON.stringify(cust).slice(0, 100));
const cc = await (await fetch(`${BASE}/master/customers/${cust.id}/contacts`, {
  method: 'POST', headers: A, body: JSON.stringify({ contactName: 'Budi', isPrimary: true }),
})).json();
check('kontak customer', cc.isPrimary === true, JSON.stringify(cc).slice(0, 100));
const vend = await (await fetch(`${BASE}/master/vendors`, {
  method: 'POST', headers: A, body: JSON.stringify({ vendorCode: 'V-001', vendorName: 'CV Supply' }),
})).json();
check('vendor', !!vend.id, JSON.stringify(vend).slice(0, 100));

const g = await (await fetch(`${BASE}/master/warehouses`, {
  method: 'POST', headers: A, body: JSON.stringify({ warehouseCode: 'G-JKT', warehouseName: 'Jakarta' }),
})).json();
const z = await (await fetch(`${BASE}/master/warehouse-zones`, {
  method: 'POST', headers: A, body: JSON.stringify({ warehouseId: g.id, zoneCode: 'A', zoneName: 'Zona A' }),
})).json();
const bin = await (await fetch(`${BASE}/master/warehouse-bins`, {
  method: 'POST', headers: A, body: JSON.stringify({ zoneId: z.id, binCode: 'A-01', binName: 'Bin 01' }),
})).json();
check('gudang→zona→bin', !!(g.id && z.id && bin.id), JSON.stringify(bin).slice(0, 100));

// Negatif RBAC: staff read-only master
const su = await (await fetch(`${BASE}/users`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ email: `staff-${SFX}@e2b.id`, password: 'Rahasia123', fullName: 'Staff' }),
})).json();
await fetch(`${BASE}/rbac/roles`, { method: 'POST', headers: A, body: JSON.stringify({ roleCode: 'RO', roleName: 'ReadOnly' }) });
await fetch(`${BASE}/rbac/roles/RO/permissions`, { method: 'POST', headers: A, body: JSON.stringify({ permissionCodes: ['masterdata.read'] }) });
await fetch(`${BASE}/users/${su.id}/roles`, { method: 'POST', headers: A, body: JSON.stringify({ roleCode: 'RO' }) });
const sl = await (await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `staff-${SFX}@e2b.id`, password: 'Rahasia123' }),
})).json();
const S = { Authorization: `Bearer ${sl.accessToken}` };
const okRead = await fetch(`${BASE}/master/items`, { headers: S });
const noWrite = await fetch(`${BASE}/master/items`, { method: 'POST', headers: { ...S, 'content-type': 'application/json' }, body: JSON.stringify({ itemCode: 'X', itemName: 'X' }) });
check('staff read 200 + write 403', okRead.status === 200 && noWrite.status === 403, `${okRead.status}/${noWrite.status}`);

console.log(`\nPASS=${pass} FAIL=${fail}`);
process.exit(fail ? 1 : 0);
