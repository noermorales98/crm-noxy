// Qué etapas muestra el widget «Deals por etapa». Puro: sin red ni base de datos.

/** Filas mínimas que muestra el widget aunque casi no haya información. */
export const MIN_STAGE_ROWS = 5;

/**
 * Solo las etapas que tienen deals. Si son menos de `min`, se completan con las siguientes etapas (vacías) en el orden del
 * pipeline hasta llegar a `min`, para que el widget nunca quede casi vacío; si el CRM tiene menos etapas, salen todas.
 * El resultado conserva el orden original.
 */
export function pickStageRows<T extends { count: number }>(stages: T[], min: number = MIN_STAGE_ROWS): T[] {
  const withDeals = stages.filter((s) => s.count > 0);
  const missing = Math.max(0, min - withDeals.length);
  if (missing === 0) return withDeals;
  const fill = new Set(stages.filter((s) => s.count <= 0).slice(0, missing));
  return stages.filter((s) => s.count > 0 || fill.has(s));
}
