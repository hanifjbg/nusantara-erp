// Logika stok murni (tanpa I/O) — dipakai InventoryService + Fase 5+.
// Policy Fase 4: (1) stok negatif dilarang; (2) valuasi moving-average;
// (3) lot kedaluwarsa ditolak saat keluar; (4) qty selalu > 0.

export const MOVEMENT_TYPES = [
  'in',
  'out',
  'transfer_out',
  'transfer_in',
  'adjust_in',
  'adjust_out',
  'opname_in',
  'opname_out',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export class StockNegativeError extends Error {
  constructor() {
    super('STOCK_NEGATIVE: stok tidak mencukupi (stok negatif dilarang)');
    this.name = 'StockNegativeError';
  }
}

export class LotExpiredError extends Error {
  constructor() {
    super('LOT_EXPIRED: lot sudah kedaluwarsa, tidak boleh keluar');
    this.name = 'LotExpiredError';
  }
}

export class InvalidQtyError extends Error {
  constructor() {
    super('INVALID_QTY: quantity harus > 0');
    this.name = 'InvalidQtyError';
  }
}

export function assertPositiveQty(qty: number): void {
  if (!Number.isFinite(qty) || qty <= 0) throw new InvalidQtyError();
}

/** Balance baru setelah movement; out memakai avg berjalan (moving-average). */
export function applyMovement(
  balanceQty: number,
  balanceAvg: number,
  qty: number,
  unitCost: number,
  direction: 'in' | 'out',
): { qty: number; avg: number; valued: number } {
  assertPositiveQty(qty);
  if (direction === 'out') {
    const next = balanceQty - qty;
    if (next < 0) throw new StockNegativeError();
    return { qty: next, avg: balanceAvg, valued: next * balanceAvg };
  }
  const next = balanceQty + qty;
  const avg = next === 0 ? 0 : (balanceQty * balanceAvg + qty * unitCost) / next;
  return { qty: next, avg, valued: next * avg };
}

/** Selisih opname: counted vs tercatat → arah adjust + qty. Nol = tidak ada movement. */
export function opnameDiff(
  recordedQty: number,
  countedQty: number,
): { direction: 'in' | 'out' | null; qty: number } {
  const diff = countedQty - recordedQty;
  if (diff === 0) return { direction: null, qty: 0 };
  return diff > 0 ? { direction: 'in', qty: diff } : { direction: 'out', qty: -diff };
}

/** True bila lot kedaluwarsa pada tanggal acuan (null = tidak ada expiry). */
export function isLotExpired(expiresAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

export function assertLotNotExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): void {
  if (isLotExpired(expiresAt, now)) throw new LotExpiredError();
}
