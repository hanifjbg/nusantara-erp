import { describe, expect, it } from 'vitest';
import { evaluateCondition, nextStep } from './engine';

describe('evaluateCondition', () => {
  it('null condition selalu lolos', () => {
    expect(evaluateCondition(null, {})).toBe(true);
    expect(evaluateCondition(undefined, { a: 1 })).toBe(true);
  });

  it('operator perbandingan', () => {
    const ctx = { total: 15000000, dept: 'IT' };
    expect(evaluateCondition({ field: 'total', op: 'gte', value: 10000000 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'total', op: 'gt', value: 15000000 }, ctx)).toBe(false);
    expect(evaluateCondition({ field: 'dept', op: 'eq', value: 'IT' }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'dept', op: 'in', value: ['HR', 'IT'] }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'missing', op: 'eq', value: 1 }, ctx)).toBe(false);
  });

  it('all / any / not', () => {
    const ctx = { total: 5, dept: 'IT' };
    expect(
      evaluateCondition(
        { all: [{ field: 'total', op: 'gte', value: 5 }, { field: 'dept', op: 'eq', value: 'IT' }] },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { any: [{ field: 'dept', op: 'eq', value: 'HR' }, { field: 'total', op: 'lt', value: 10 }] },
        ctx,
      ),
    ).toBe(true);
    expect(evaluateCondition({ not: { field: 'dept', op: 'eq', value: 'IT' } }, ctx)).toBe(false);
  });
});

describe('nextStep (conditional branch)', () => {
  const steps = [
    { order: 1, condition: null },
    { order: 2, condition: { field: 'total', op: 'gte', value: 10000000 } },
    { order: 3, condition: null },
  ];

  it('lompat step yang condition-nya gagal', () => {
    expect(nextStep(steps, 1, { total: 1000 })?.order).toBe(3);
    expect(nextStep(steps, 1, { total: 20000000 })?.order).toBe(2);
  });

  it('null bila tidak ada step tersisa', () => {
    expect(nextStep(steps, 3, {})).toBeNull();
    expect(nextStep([], null, {})).toBeNull();
  });

  it('mulai dari awal bila current null', () => {
    expect(nextStep(steps, null, {})?.order).toBe(1);
  });
});
