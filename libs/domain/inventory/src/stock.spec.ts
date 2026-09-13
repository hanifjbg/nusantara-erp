import { describe, expect, it } from 'vitest';
import {
  InvalidQtyError,
  LotExpiredError,
  StockNegativeError,
  applyMovement,
  assertLotNotExpired,
  isLotExpired,
  opnameDiff,
} from './stock';

describe('applyMovement (moving-average)', () => {
  it('in: qty nambah + avg tertimbang', () => {
    const r = applyMovement(10, 100, 10, 200, 'in');
    expect(r.qty).toBe(20);
    expect(r.avg).toBe(150);
    expect(r.valued).toBe(3000);
  });

  it('in dari nol: avg = unit cost', () => {
    const r = applyMovement(0, 0, 5, 80, 'in');
    expect(r).toEqual({ qty: 5, avg: 80, valued: 400 });
  });

  it('out: qty kurang, avg tetap', () => {
    const r = applyMovement(20, 150, 5, 999, 'out');
    expect(r).toEqual({ qty: 15, avg: 150, valued: 2250 });
  });

  it('out melebihi stok → STOCK_NEGATIVE', () => {
    expect(() => applyMovement(3, 100, 4, 100, 'out')).toThrow(StockNegativeError);
  });

  it('qty nol/negatif → INVALID_QTY', () => {
    expect(() => applyMovement(10, 100, 0, 100, 'in')).toThrow(InvalidQtyError);
    expect(() => applyMovement(10, 100, -2, 100, 'out')).toThrow(InvalidQtyError);
  });
});

describe('opnameDiff', () => {
  it('selisih positif → in, negatif → out, nol → null', () => {
    expect(opnameDiff(10, 12)).toEqual({ direction: 'in', qty: 2 });
    expect(opnameDiff(10, 7)).toEqual({ direction: 'out', qty: 3 });
    expect(opnameDiff(10, 10)).toEqual({ direction: null, qty: 0 });
  });
});

describe('lot expiry', () => {
  it('kedaluwarsa vs belum', () => {
    const now = new Date('2026-09-13T00:00:00Z');
    expect(isLotExpired('2026-09-01', now)).toBe(true);
    expect(isLotExpired('2026-10-01', now)).toBe(false);
    expect(isLotExpired(null, now)).toBe(false);
  });

  it('assert melempar LOT_EXPIRED', () => {
    expect(() => assertLotNotExpired('2020-01-01')).toThrow(LotExpiredError);
    expect(() => assertLotNotExpired(null)).not.toThrow();
  });
});
