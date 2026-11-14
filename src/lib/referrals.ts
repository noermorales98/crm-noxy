// Reporte de referidos: cuántos leads trae cada cliente (o contacto) y cuántos se cerraron.
// Funciones puras; la consulta vive en el endpoint y en la ficha del cliente.

export type ReferredDeal = {
  id: string;
  value: number | null;
  currency: string;
  stage: { isWon: boolean; isLost: boolean };
  referrerId: string;
  referrerName: string;
};

export type ReferrerRow = {
  referrerId: string;
  name: string;
  referrals: number;
  won: number;
  lost: number;
  open: number;
  wonValue: Record<string, number>;
};

export function summarizeReferrals(deals: ReferredDeal[]): ReferrerRow[] {
  const byReferrer = new Map<string, ReferrerRow>();
  for (const d of deals) {
    const row =
      byReferrer.get(d.referrerId) ??
      { referrerId: d.referrerId, name: d.referrerName, referrals: 0, won: 0, lost: 0, open: 0, wonValue: {} };
    row.referrals += 1;
    if (d.stage.isWon) {
      row.won += 1;
      row.wonValue[d.currency] = (row.wonValue[d.currency] ?? 0) + (d.value ?? 0);
    } else if (d.stage.isLost) row.lost += 1;
    else row.open += 1;
    byReferrer.set(d.referrerId, row);
  }
  return [...byReferrer.values()].sort((a, b) => b.referrals - a.referrals || b.won - a.won || a.name.localeCompare(b.name));
}
