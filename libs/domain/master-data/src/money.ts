// Helper moneter murni (dipakai Fase 2 & 7): konversi kurs & hitung pajak.
// Semua input desimal sebagai string/number; output dibulatkan ke decimalPlaces (default 4,
// sesuai konvensi DECIMAL(19,4)).
export function convertCurrency(
  amount: string | number,
  rate: string | number,
  decimalPlaces = 4,
): string {
  const result = Number(amount) * Number(rate);
  if (!Number.isFinite(result)) throw new Error('amount/rate tidak valid');
  return result.toFixed(decimalPlaces);
}

/** Pajak = base * ratePct / 100, dibulatkan ke decimalPlaces. */
export function computeTax(
  base: string | number,
  ratePct: string | number,
  decimalPlaces = 4,
): string {
  const result = (Number(base) * Number(ratePct)) / 100;
  if (!Number.isFinite(result)) throw new Error('base/rate tidak valid');
  return result.toFixed(decimalPlaces);
}

/** Total inklusif pajak. */
export function addTax(base: string | number, ratePct: string | number, decimalPlaces = 4): string {
  return (Number(base) + Number(computeTax(base, ratePct, decimalPlaces))).toFixed(decimalPlaces);
}
