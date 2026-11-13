/** Importe con su moneda (es-MX). Aparte de quotes.ts para poder usarlo también desde el navegador. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
