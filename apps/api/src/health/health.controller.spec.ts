import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController (Fase 0)', () => {
  it('GET /health -> { status: "ok" }', () => {
    const c = new HealthController();
    expect(c.check()).toEqual({ status: 'ok' });
  });
});
