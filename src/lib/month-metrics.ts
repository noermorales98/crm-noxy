import { prisma } from "@/src/lib/db";
import { computeMonthMetrics } from "@/src/lib/month-close-service";
import { monthKeyInZone, parseMonthKey, sumMonthMetrics, toMonthKey, type MonthKey, type MonthMetrics } from "@/src/lib/month-close";

export type LoadedMonth =
  | { ok: true; month: MonthKey; source: "snapshot" | "live" | "none"; metrics: MonthMetrics | null; note?: string }
  | { ok: false; error: string };

/**
 * Métricas de un mes: la foto guardada si existe; el mes en curso se calcula en vivo;
 * un mes terminado sin foto devuelve «none» (el cierre la creará en su próxima ejecución).
 */
export async function loadMonthMetrics(organizationId: string, month: string): Promise<LoadedMonth> {
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
  | { ok: true; year: number; source: "year"; metrics: MonthMetrics | null; months: number; note?: string }
  | { ok: false; error: string };

/** Resumen de un año: suma de los meses que ya tienen cifras (foto guardada o mes en curso en vivo). */
export async function loadYearMetrics(organizationId: string, year: number): Promise<LoadedYear> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "El año debe tener 4 dígitos (p. ej. 2026)" };
  const loaded = await Promise.all(Array.from({ length: 12 }, (_, i) => loadMonthMetrics(organizationId, toMonthKey(year, i + 1))));
  const metrics = loaded.flatMap((item) => (item.ok && item.metrics ? [item.metrics] : []));
  if (metrics.length === 0) return { ok: true, year, source: "year", metrics: null, months: 0, note: "Sin cifras guardadas para este año." };
  return { ok: true, year, source: "year", metrics: sumMonthMetrics(year, metrics), months: metrics.length };
}
