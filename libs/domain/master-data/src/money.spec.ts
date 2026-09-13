import { describe, expect, it } from 'vitest';
import { addTax, computeTax, convertCurrency } from './money';

describe('money helpers (DECIMAL 4)', () => {
  it('convertCurrency: 100 USD * 15850 → IDR', () => {
    expect(convertCurrency('100', '15850')).toBe('1585000.0000');
  });

  it('same currency rate 1', () => {
    expect(convertCurrency('99.5', '1')).toBe('99.5000');
  });

  it('computeTax: PPN 11% dari 100000', () => {
    expect(computeTax('100000', '11')).toBe('11000.0000');
  });

  it('addTax: total inklusif', () => {
    expect(addTax('100000', '11')).toBe('111000.0000');
  });

  it('menolak input invalid', () => {
    expect(() => convertCurrency('abc', '1')).toThrow();
    expect(() => computeTax('1', 'x')).toThrow();
  });
});
