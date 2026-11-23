import { prisma } from "@/src/lib/db";
import {
  buildMonthMetrics,
  isAutoArchivable,
  isFinalWonStage,
  monthKeyInZone,
  monthKeysBetween,
  monthRangeInZone,
  parseMonthKey,
  previousMonthKey,
  type MonthKey,
  type MonthMetrics,
} from "@/src/lib/month-close";

const wonInRange = (from: Date, to: Date) => ({
  stage: { isWon: true },
  OR: [{ wonAt: { gte: from, lt: to } }, { wonAt: null, updatedAt: { gte: from, lt: to } }],
});

/** Calcula las métricas de un mes ya terminado. `current` = foto del mes en curso (sin guardar ni archivar). */
export async function computeMonthMetrics(organizationId: string, key: MonthKey, timeZone: string, options?: { withOpen?: boolean }): Promise<MonthMetrics> {
  const { from, to } = monthRangeInZone(key, timeZone);
  const [created, won, lostCount, payments, open] = await Promise.all([
    prisma.deal.count({ where: { organizationId, createdAt: { gte: from, lt: to } } }),
    prisma.deal.findMany({
      where: { organizationId, ...wonInRange(from, to) },
      select: { value: true, currency: true, quotes: { select: { status: true, total: true, currency: true } } },
    }),
    prisma.deal.count({ where: { organizationId, stage: { isLost: true }, updatedAt: { gte: from, lt: to } } }),
    prisma.payment.findMany({
      where: { organizationId, status: "RECIBIDO", receivedAt: { gte: from, lt: to } },
      select: { amount: true, currency: true },
    }),
    options?.withOpen
      ? prisma.deal.findMany({ where: { organizationId, isArchived: false, stage: { isWon: false, isLost: false } }, select: { value: true, currency: true } })
      : Promise.resolve(undefined),
  ]);
  return buildMonthMetrics({ month: key, created, won, lostCount, payments, open });
}

/** Archiva los ganados del mes que estén en la etapa ganada final de su pipeline. Devuelve cuántos. */
async function archiveWonOfMonth(organizationId: string, key: MonthKey, timeZone: string): Promise<number> {
  const { from, to } = monthRangeInZone(key, timeZone);
  const deals = await prisma.deal.findMany({
    where: { organizationId, isArchived: false, ...wonInRange(from, to) },
    select: { id: true, stage: { select: { order: true, name: true, pipelineId: true } } },
  });
  if (deals.length === 0) return 0;
  const pipelineIds = Array.from(new Set(deals.map((deal) => deal.stage.pipelineId)));
  const wonStages = await prisma.stage.findMany({ where: { pipelineId: { in: pipelineIds }, isWon: true }, select: { pipelineId: true, order: true } });
  const maxOrder = new Map<string, number>();
  for (const stage of wonStages) maxOrder.set(stage.pipelineId, Math.max(maxOrder.get(stage.pipelineId) ?? -1, stage.order));
  const ids = deals.filter((deal) => isFinalWonStage(deal.stage, maxOrder.get(deal.stage.pipelineId) ?? deal.stage.order)).map((deal) => deal.id);
  if (ids.length === 0) return 0;
  const result = await prisma.deal.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } });
  return result.count;
}

/**
 * Cierra los meses terminados que aún no tienen foto: guarda su MonthlySnapshot y archiva sus ganados finales.
 * Idempotente (la foto es única por organización y mes), así que se puede llamar en cada ejecución del cron.
 * Desde el primer mes con ventas ganadas hasta el mes anterior; tope de 24 meses por ejecución.
 */
export async function closePendingMonths(organizationId: string, timeZone: string, now = new Date()) {
  const lastClosed = previousMonthKey(monthKeyInZone(now, timeZone));
  const existing = await prisma.monthlySnapshot.findMany({ where: { organizationId }, select: { year: true, month: true } });
  const have = new Set(existing.map((row) => `${row.year}-${String(row.month).padStart(2, "0")}`));

  const firstWon = await prisma.deal.findFirst({
    where: { organizationId, stage: { isWon: true } },
    orderBy: { wonAt: "asc" },
    select: { wonAt: true, updatedAt: true },
  });
  const firstKey = firstWon ? monthKeyInZone(firstWon.wonAt ?? firstWon.updatedAt, timeZone) : lastClosed;
  const keys = monthKeysBetween(firstKey <= lastClosed ? firstKey : lastClosed, lastClosed, 24).filter((key) => !have.has(key));

  const closed: { month: MonthKey; archived: number }[] = [];
  for (const key of keys) {
    const parsed = parseMonthKey(key)!;
    // «Abierto al cierre» solo tiene sentido para el mes recién terminado (para los viejos no se puede saber).
    const metrics = await computeMonthMetrics(organizationId, key, timeZone, { withOpen: key === lastClosed });
    await prisma.monthlySnapshot.createMany({
      data: [{ organizationId, year: parsed.year, month: parsed.month, metrics: metrics as unknown as object }],
      skipDuplicates: true,
    });
    closed.push({ month: key, archived: await archiveWonOfMonth(organizationId, key, timeZone) });
  }
  return closed;
}

/** Cierra los meses pendientes de todas las organizaciones. Nunca lanza: un fallo no debe frenar el resumen diario. */
export async function closePendingMonthsForAll(now = new Date()) {
  const results: { organizationId: string; closed: { month: MonthKey; archived: number }[] }[] = [];
  try {
    const organizations = await prisma.organization.findMany({ select: { id: true, timezone: true } });
    for (const org of organizations) {
      try {
        const closed = await closePendingMonths(org.id, org.timezone || "America/Cancun", now);
        if (closed.length) results.push({ organizationId: org.id, closed });
      } catch (error) {
        console.error("[month-close]", org.id, error);
      }
    }
  } catch (error) {
    console.error("[month-close] all", error);
  }
  return results;
}

/**
 * Archivo automático por antigüedad (cron `auto-archive`): solo los ganados que ya están en la última etapa ganadora
 * de su pipeline y llevan más de `days` días ganados. Misma regla de «etapa final» que el cierre mensual.
 */
export async function archiveStaleWonDeals(organizationId: string, days: number, now = new Date()): Promise<number> {
  if (days <= 0) return 0;
  const threshold = new Date(now.getTime() - days * 86_400_000);
  const candidates = await prisma.deal.findMany({
    where: {
      organizationId,
      isArchived: false,
      stage: { isWon: true },
      OR: [{ wonAt: { lte: threshold } }, { wonAt: null, updatedAt: { lte: threshold } }],
    },
    select: { id: true, wonAt: true, updatedAt: true, stage: { select: { order: true, name: true, pipelineId: true } } },
  });
  if (candidates.length === 0) return 0;
  const pipelineIds = Array.from(new Set(candidates.map((deal) => deal.stage.pipelineId)));
  const wonStages = await prisma.stage.findMany({ where: { pipelineId: { in: pipelineIds }, isWon: true }, select: { pipelineId: true, order: true } });
  const maxOrder = new Map<string, number>();
  for (const stage of wonStages) maxOrder.set(stage.pipelineId, Math.max(maxOrder.get(stage.pipelineId) ?? -1, stage.order));
  const ids = candidates.filter((deal) => isAutoArchivable(deal, maxOrder.get(deal.stage.pipelineId) ?? deal.stage.order, threshold)).map((deal) => deal.id);
  if (ids.length === 0) return 0;
  const result = await prisma.deal.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: now } });
  return result.count;
}
