import { prisma } from "@/src/lib/db";

export async function loadSalesMetrics(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [totalDeals, dealsThisMonth, allDeals, revenueData, followUpsData] = await Promise.all([
    prisma.deal.count({ where: { organizationId } }),
    prisma.deal.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
    prisma.deal.findMany({
      where: { organizationId },
      select: { value: true, stage: { select: { isWon: true, isLost: true } } },
    }),
    prisma.payment.aggregate({
      where: { organizationId, status: "RECIBIDO", receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.deal.findMany({
      where: { organizationId, followUpAt: { lte: now }, stage: { isWon: false, isLost: false } },
      select: {
        id: true,
        title: true,
        followUpAt: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { followUpAt: "asc" },
      take: 10,
    }),
  ]);

  const wonDeals = allDeals.filter((deal) => deal.stage.isWon).length;
  const lostDeals = allDeals.filter((deal) => deal.stage.isLost).length;
  const activeDeals = allDeals.filter((deal) => !deal.stage.isWon && !deal.stage.isLost);

  return {
    totalDeals,
    dealsThisMonth,
    wonDeals,
    lostDeals,
    activeDeals: activeDeals.length,
    followUpsDue: followUpsData.length,
    closingRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
    pipelineValue: activeDeals.reduce((sum, deal) => sum + (deal.value ?? 0), 0),
    revenueThisMonth: revenueData._sum.amount ?? 0,
    followUps: followUpsData,
  };
}

export function conversionReportText(
  metrics: Awaited<ReturnType<typeof loadSalesMetrics>>,
  periodo?: string,
): string {
  const title = periodo ? `Reporte de conversión (${periodo})` : "Reporte de conversión";
  const followUps = metrics.followUps
    .map((deal) => {
      const name = [deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ");
      return `- ${deal.title}${name ? ` (${name})` : ""}`;
    })
    .join("\n");
  return [
    title,
    `Deals: ${metrics.totalDeals}. Este mes: ${metrics.dealsThisMonth}.`,
    `Activos: ${metrics.activeDeals}. Ganados: ${metrics.wonDeals}. Perdidos: ${metrics.lostDeals}.`,
    `Tasa de cierre: ${metrics.closingRate}%.`,
    `Valor del pipeline: ${metrics.pipelineValue}.`,
    `Ingresos del mes: ${metrics.revenueThisMonth}.`,
    `Seguimientos vencidos: ${metrics.followUpsDue}.`,
    followUps,
    "Redacta el informe con estas cifras. No inventes números.",
  ]
    .filter(Boolean)
    .join("\n");
}
