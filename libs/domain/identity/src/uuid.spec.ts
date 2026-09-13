import { describe, expect, it } from 'vitest';
import { isUuid, uuidv7 } from './uuid';

describe('uuidv7 (PK time-ordered)', () => {
  it('format RFC 9562 v7', () => {
    const id = uuidv7();
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe('7');
    expect(['8', '9', 'a', 'b']).toContain(id[19].toLowerCase());
  });

  it('urut waktu (time-ordered)', () => {
    const a = uuidv7(new Date('2026-09-01T00:00:00Z'));
    const b = uuidv7(new Date('2026-09-12T00:00:00Z'));
    expect(a < b).toBe(true);
  });

  it('unik', () => {
    expect(new Set([uuidv7(), uuidv7(), uuidv7()]).size).toBe(3);
  });

  it('isUuid menolak non-uuid', () => {
    expect(isUuid('bukan-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
