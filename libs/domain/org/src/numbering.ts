// Format nomor dokumen (pure function — dipakai NumberingService).
// Pattern mendukung token: {YYYY} {YY} {MM} {DD} {SEQ[:pad]} {PREFIX}.
// Contoh: "SO/{YYYY}/{MM}/{SEQ:5}" + seq 42 → "SO/2026/09/00042".
export function formatDocumentNumber(
  pattern: string,
  seq: number,
  opts: { prefix?: string | null; date?: Date } = {},
): string {
  const date = opts.date ?? new Date();
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  return pattern
    .replace('{YYYY}', String(date.getFullYear()))
    .replace('{YY}', String(date.getFullYear()).slice(2))
    .replace('{MM}', pad(date.getMonth() + 1, 2))
    .replace('{DD}', pad(date.getDate(), 2))
    .replace('{PREFIX}', opts.prefix ?? '')
    .replace(/\{SEQ(?::(\d+))?\}/g, (_m, width: string | undefined) =>
      width ? pad(seq, parseInt(width, 10)) : String(seq),
    );
}
