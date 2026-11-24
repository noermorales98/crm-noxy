// Datos de los gráficos del historial de ventas: funciones puras, sin React.

export type HistoryDeal = {
  value?: number | null;
  currency?: string | null;
  wonAt?: string | null;
  archivedAt?: string | null;
  stage?: { isWon?: boolean; isLost?: boolean } | null;
};

export type TimeBucket = { key: string; label: string; full: string; MXN: number; USD: number; nMXN: number; nUSD: number; won: number; lost: number };

const MONTH_FULL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Fecha que ubica la venta en el tiempo: cierre (wonAt) o, si falta, archivado. */
export function dealDate(deal: HistoryDeal): Date | null {
  const raw = deal.wonAt ?? deal.archivedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Agrupa por mes (todo el año) o por día (un mes concreto). Siempre devuelve todos los cubos del período,
 * también los vacíos, para que el eje no salte. `month` es 1-12 o "" para todo el año.
 */
export function bucketDeals(deals: HistoryDeal[], year: number, month: number | ""): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  if (month === "") {
    for (let m = 0; m < 12; m++) buckets.push({ key: String(m), label: MONTH_SHORT[m], full: `${MONTH_FULL[m]} ${year}`, MXN: 0, USD: 0, nMXN: 0, nUSD: 0, won: 0, lost: 0 });
  } else {
    const days = new Date(year, month, 0).getDate();
    for (let d = 1; d <= days; d++) buckets.push({ key: String(d - 1), label: String(d), full: `${d} de ${MONTH_FULL[month - 1]} ${year}`, MXN: 0, USD: 0, nMXN: 0, nUSD: 0, won: 0, lost: 0 });
  }
  for (const deal of deals) {
    const date = dealDate(deal);
    if (!date || date.getFullYear() !== year) continue;
    const index = month === "" ? date.getMonth() : date.getMonth() + 1 === month ? date.getDate() - 1 : -1;
    const bucket = buckets[index];
    if (!bucket) continue;
    if (deal.stage?.isWon) {
      bucket.won++;
      if (deal.currency === "MXN") {
        bucket.MXN += deal.value ?? 0;
        bucket.nMXN++;
      } else {
        bucket.USD += deal.value ?? 0;
        bucket.nUSD++;
      }
    } else if (deal.stage?.isLost) {
      bucket.lost++;
    }
  }
  return buckets;
}

/** Ganados y perdidos para el resumen de resultado. */
export function outcomeCounts(deals: HistoryDeal[]): { won: number; lost: number; rate: number | null } {
  const won = deals.filter((d) => d.stage?.isWon).length;
  const lost = deals.filter((d) => d.stage?.isLost).length;
  return { won, lost, rate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null };
}
