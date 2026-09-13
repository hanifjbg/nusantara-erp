import { describe, expect, it } from 'vitest';
import { sha256 } from './crypto';

describe('sha256 (refresh token hash)', () => {
  it('deterministik 64 hex', () => {
    const h = sha256('token-abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('token-abc')).toBe(h);
  });

  it('token beda → hash beda', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});
