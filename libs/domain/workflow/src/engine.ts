// Engine workflow murni (tanpa I/O) — dipakai WorkflowService + modul Fase 4+.
// Step: { order, condition } — condition_json format:
//   { field, op, value } | { all: [...] } | { any: [...] } | { not: ... }
// op: eq | ne | gt | gte | lt | lte | in
// context: record dokumen (mis. { total: 15000000, department: 'IT' }).
// null/undefined condition = selalu lolos.

export type Condition =
  | { field: string; op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'; value: unknown }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface StepLike {
  order: number;
  condition: unknown;
}

function getPath(context: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

export function evaluateCondition(condition: unknown, context: Record<string, unknown>): boolean {
  if (condition === null || condition === undefined) return true;
  const c = condition as Condition;
  if ('all' in c && Array.isArray(c.all)) return c.all.every((x) => evaluateCondition(x, context));
  if ('any' in c && Array.isArray(c.any)) return c.any.some((x) => evaluateCondition(x, context));
  if ('not' in c) return !evaluateCondition(c.not, context);
  if ('field' in c && 'op' in c) {
    const actual = getPath(context, c.field);
    const expected = (c as { value: unknown }).value;
    switch (c.op) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      default:
        return false;
    }
  }
  return false;
}

/** Step pertama dengan order > current yang condition-nya lolos (null bila selesai). */
export function nextStep<T extends StepLike>(
  steps: T[],
  currentOrder: number | null,
  context: Record<string, unknown>,
): T | null {
  const from = currentOrder ?? 0;
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  for (const s of sorted) {
    if (s.order > from && evaluateCondition(s.condition, context)) return s;
  }
  return null;
}
