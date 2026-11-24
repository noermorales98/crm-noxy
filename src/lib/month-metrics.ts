import { prisma } from "@/src/lib/db";
import { computeMonthMetrics } from "@/src/lib/month-close-service";
import { inProgressReason, monthKeyInZone, monthRangeInZone, parseMonthKey, sumMonthMetrics, toMonthKey, type MonthKey, type MonthMetrics } from "@/src/lib/month-close";
import { effectiveDealValue, type Money } from "@/src/lib/deal-sales";

/** Ventas ya contadas como ganadas que siguen a mitad de proceso (se calcula en vivo, no entra en la foto del mes). */
export type InProgressSales = {
  count: number;
  byCurrency: Money;
  deals: { id: string; title: string; amount: number; currency: string; reason: string }[];
};

export type LoadedMonth =
  | { ok: true; month: MonthKey; source: "snapshot" | "live" | "none"; metrics: MonthMetrics | null; inProgress?: InProgressSales; note?: string }
  | { ok: false; error: string };

/**
 * Métricas de un mes: la foto guardada si existe; el mes en curso se calcula en vivo;
 * un mes terminado sin foto devuelve «none» (el cierre la creará en su próxima ejecución).
 */
async function loadMonthMetricsBase(organizationId: string, month: string): Promise<LoadedMonth> {
  const parsed = parseMonthKey(month);
  if (!parsed) return { ok: false, error: "El mes debe tener formato YYYY-MM (p. ej. 2026-10)" };
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  const timeZone = org?.timezone || "America/Cancun";

  const snapshot = await prisma.monthlySnapshot.findUnique({
    where: { organizationId_year_month: { organizationId, year: parsed.year, month: parsed.month } },
  });
  if (snapshot) return { ok: true, month, source: "snapshot", metrics: snapshot.metrics as unknown as MonthMetrics };

  const current = monthKeyInZone(new Date(), timeZone);
  if (month === current) return { ok: true, month, source: "live", metrics: await computeMonthMetrics(organizationId, month, timeZone, { withOpen: true }), note: "Mes en curso: cifras en vivo, aún sin cerrar." };
  if (month > current) return { ok: true, month, source: "none", metrics: null, note: "Ese mes aún no llega." };
  return { ok: true, month, source: "none", metrics: null, note: "Mes sin cierre guardado; se genera en la próxima ejecución del cron." };
}

export type LoadedYear =
  | { ok: true; year: number; source: "year"; metrics: MonthMetrics | null; months: number; inProgress?: InProgressSales; note?: string }
  | { ok: false; error: string };

/** Resumen de un año: suma de los meses que ya tienen cifras (foto guardada o mes en curso en vivo). */
export async function loadYearMetrics(organizationId: string, year: number): Promise<LoadedYear> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "El año debe tener 4 dígitos (p. ej. 2026)" };
  const loaded = await Promise.all(Array.from({ length: 12 }, (_, i) => loadMonthMetricsBase(organizationId, toMonthKey(year, i + 1))));
  const metrics = loaded.flatMap((item) => (item.ok && item.metrics ? [item.metrics] : []));
  if (metrics.length === 0) return { ok: true, year, source: "year", metrics: null, months: 0, note: "Sin cifras guardadas para este año." };
  const timeZone = await orgTimeZone(organizationId);
  const from = monthRangeInZone(toMonthKey(year, 1), timeZone).from;
  const to = monthRangeInZone(toMonthKey(year, 12), timeZone).to;
  return { ok: true, year, source: "year", metrics: sumMonthMetrics(year, metrics), months: metrics.length, inProgress: await loadInProgressSales(organizationId, from, to) };
}

/** Ganadas del período que aún no terminan: etapa ganada no final, o saldo por cobrar. */
export async function loadInProgressSales(organizationId: string, from: Date, to: Date): Promise<InProgressSales> {
  const deals = await prisma.deal.findMany({
    where: { organizationId, stage: { isWon: true }, OR: [{ wonAt: { gte: from, lt: to } }, { wonAt: null, updatedAt: { gte: from, lt: to } }] },
    select: { id: true, title: true, value: true, currency: true, stage: { select: { order: true, name: true, pipelineId: true } }, quotes: { select: { status: true, total: true, currency: true } } },
  });
  const pipelineIds = Array.from(new Set(deals.map((deal) => deal.stage.pipelineId)));
  const wonStages = pipelineIds.length ? await prisma.stage.findMany({ where: { pipelineId: { in: pipelineIds }, isWon: true }, select: { pipelineId: true, order: true } }) : [];
  const maxOrder = new Map<string, number>();
  for (const stage of wonStages) maxOrder.set(stage.pipelineId, Math.max(maxOrder.get(stage.pipelineId) ?? -1, stage.order));

  const result: InProgressSales = { count: 0, byCurrency: {}, deals: [] };
  for (const deal of deals) {
    const reason = inProgressReason(deal, maxOrder.get(deal.stage.pipelineId) ?? deal.stage.order);
    if (!reason) continue;
    const { amount, currency } = effectiveDealValue({ value: deal.value, currency: deal.currency, quotes: deal.quotes });
    result.count++;
    result.byCurrency[currency] = (result.byCurrency[currency] ?? 0) + amount;
    result.deals.push({ id: deal.id, title: deal.title, amount, currency, reason });
  }
  return result;
}

async function orgTimeZone(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  return org?.timezone || "America/Cancun";
}

/** Métricas del mes + lo que sigue a mitad de proceso (en vivo). */
export async function loadMonthMetrics(organizationId: string, month: string): Promise<LoadedMonth> {
  const base = await loadMonthMetricsBase(organizationId, month);
  if (!base.ok || !base.metrics) return base;
  const { from, to } = monthRangeInZone(month, await orgTimeZone(organizationId));
  return { ...base, inProgress: await loadInProgressSales(organizationId, from, to) };
}
