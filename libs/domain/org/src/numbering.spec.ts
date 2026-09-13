import { describe, expect, it } from 'vitest';
import { formatDocumentNumber } from './numbering';

describe('formatDocumentNumber', () => {
  const date = new Date('2026-09-12T00:00:00');

  it('SO/{YYYY}/{MM}/{SEQ:5}', () => {
    expect(formatDocumentNumber('SO/{YYYY}/{MM}/{SEQ:5}', 42, { date })).toBe('SO/2026/09/00042');
  });

  it('SEQ tanpa padding + PREFIX', () => {
    expect(formatDocumentNumber('{PREFIX}-{YY}{MM}-{SEQ}', 7, { prefix: 'PO', date })).toBe(
      'PO-2609-7',
    );
  });

  it('counter naik → nomor naik', () => {
    const a = formatDocumentNumber('INV/{YYYY}/{SEQ:4}', 1, { date });
    const b = formatDocumentNumber('INV/{YYYY}/{SEQ:4}', 2, { date });
    expect(a).toBe('INV/2026/0001');
    expect(b).toBe('INV/2026/0002');
  });
});
