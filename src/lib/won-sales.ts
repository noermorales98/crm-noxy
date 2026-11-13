import { prisma } from "@/src/lib/db";
import { summarizeWonSales, type WonSalesSummary } from "@/src/lib/deal-sales";

export type WonSalesReport = WonSalesSummary & {
  recent: { id: string; title: string; value: number; currency: string; wonAt: Date; quotes: string[] }[];
};

/** Ventas = leads en etapa ganada (sin archivados), con las cotizaciones ligadas a cada uno. */
export async function loadWonSales(organizationId: string): Promise<WonSalesReport> {
  const deals = await prisma.deal.findMany({
    where: { organizationId, isArchived: false, stage: { isWon: true } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      value: true,
      currency: true,
      updatedAt: true,
      quotes: { select: { folio: true, status: true, total: true, currency: true } },
    },
  });
  return {
    ...summarizeWonSales(deals),
    recent: deals.slice(0, 5).map((deal) => ({
      id: deal.id,
      title: deal.title,
      value: deal.value ?? 0,
      currency: deal.currency,
      wonAt: deal.updatedAt,
      quotes: deal.quotes.map((quote) => quote.folio),
    })),
  };
}
