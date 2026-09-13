// Helper UUID v7 (00-architecture.md: PK UUID v7 — time-ordered, index-friendly).
// RFC 9562: 48-bit unix ms + ver(0111) + 12-bit rand + var(10) + 62-bit rand.
export function uuidv7(date: Date = new Date()): string {
  const ms = date.getTime();
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  const timeHex = ms.toString(16).padStart(12, '0');
  const seg1 = timeHex.slice(0, 8);
  const seg2 = timeHex.slice(8, 12);
  const seg3 = `7${hex.slice(0, 3)}`;
  const seg4 = (((parseInt(hex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + hex.slice(4, 7));
  const seg5 = hex.slice(7, 19);
  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
