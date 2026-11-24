// Conectar una cotización con un deal (vincular uno existente o crear uno nuevo). Lo usan la API, el MCP y la IA,
// así las tres siguen la misma regla: UNA fecha por venta; si hay fechas distintas se pregunta cuál es la correcta.
import { prisma } from "@/src/lib/db";
import { refreshSnapshotsForDates } from "@/src/lib/month-close-service";
import { dayInZone, saleDateChoices, type SaleDateChoice } from "@/src/lib/quote-sales";

export type LinkFailure = { ok: false; status: number; error: string; needsDate?: true; choices?: SaleDateChoice[] };

type QuoteRow = NonNullable<Awaited<ReturnType<typeof findQuoteForLink>>>;

export const findQuoteForLink = (organizationId: string, idOrFolio: string) =>
  prisma.quote.findFirst({ where: { organizationId, OR: [{ id: idOrFolio }, { folio: idOrFolio }] } });

async function orgTimeZone(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  return org?.timezone || "America/Cancun";
}

/**
 * Vincula (o desvincula con `dealId` null) una cotización. Si el deal está ganado y trae otra fecha que la cotización
 * (aceptada, pagada…) y no se indicó `saleDate`, no cambia nada y devuelve las opciones para preguntar.
 */
export async function linkQuoteToDeal(args: { organizationId: string; quote: QuoteRow; dealId: string | null; saleDate?: string }) {
  const { organizationId, quote, dealId, saleDate } = args;
  const deal = dealId ? await prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true, wonAt: true, stage: { select: { isWon: true } } } }) : null;
  if (dealId && !deal) return { ok: false, status: 400, error: "Lead inválido" } satisfies LinkFailure;

  let newWonAt: Date | null = null;
  if (deal?.stage.isWon) {
    const timeZone = await orgTimeZone(organizationId);
    const choices = saleDateChoices(quote, deal.wonAt, timeZone);
    let chosen: string | undefined;
    if (typeof saleDate === "string") {
      if (!choices.some((choice) => choice.value === saleDate)) return { ok: false, status: 400, error: "Esa fecha no es una de las posibles" } satisfies LinkFailure;
      chosen = saleDate;
    } else if (choices.length > 1) {
      return { ok: false, status: 409, error: "El deal y la cotización tienen fechas distintas: elige cuál es la de la venta", needsDate: true, choices } satisfies LinkFailure;
    } else {
      chosen = choices[0]?.value;
    }
    if (chosen && (!deal.wonAt || dayInZone(new Date(chosen), timeZone) !== dayInZone(deal.wonAt, timeZone))) newWonAt = new Date(chosen);
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: { dealId },
    select: { id: true, folio: true, dealId: true, deal: { select: { id: true, title: true } } },
  });
  if (deal && newWonAt) {
    await prisma.deal.update({ where: { id: deal.id }, data: { wonAt: newWonAt } });
    await refreshSnapshotsForDates(organizationId, [deal.wonAt, newWonAt]); // el mes viejo y el nuevo
  }
  return { ok: true, quote: updated, wonAt: newWonAt } as const;
}

/**
 * Crea un deal con el cliente, la moneda y el total de la cotización y la vincula. En una etapa ganada, su fecha de venta
 * es una sola: con fechas distintas devuelve las opciones (409) y se repite con `saleDate`.
 */
export async function createDealFromQuote(args: { organizationId: string; quote: QuoteRow; stageId: string; title?: string; saleDate?: string }) {
  const { organizationId, quote, stageId, title, saleDate } = args;
  if (quote.dealId) return { ok: false, status: 409, error: "La cotización ya está vinculada a un deal" } satisfies LinkFailure;
  const stage = await prisma.stage.findFirst({ where: { id: stageId, pipeline: { organizationId } }, select: { id: true, pipelineId: true, isWon: true, isLost: true } });
  if (!stage) return { ok: false, status: 404, error: "Etapa no válida" } satisfies LinkFailure;
  if (stage.isLost) return { ok: false, status: 400, error: "Un deal nuevo no puede nacer como perdido" } satisfies LinkFailure;

  let wonAt: Date | null = null;
  if (stage.isWon) {
    const choices = saleDateChoices(quote, null, await orgTimeZone(organizationId));
    if (saleDate) {
      const picked = choices.find((choice) => choice.value === saleDate);
      if (!picked) return { ok: false, status: 400, error: "Esa fecha no es una de las de la cotización" } satisfies LinkFailure;
      wonAt = new Date(picked.value);
    } else if (choices.length > 1) {
      return { ok: false, status: 409, error: "La cotización tiene fechas distintas: elige cuál es la de la venta", needsDate: true, choices } satisfies LinkFailure;
    } else {
      wonAt = choices[0] ? new Date(choices[0].value) : new Date();
    }
  }

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: { title: title?.trim() || quote.clientName, value: quote.total, currency: quote.currency, stageId: stage.id, pipelineId: stage.pipelineId, organizationId, contactId: quote.contactId, wonAt },
      select: { id: true, title: true, wonAt: true },
    });
    await tx.quote.update({ where: { id: quote.id }, data: { dealId: created.id } });
    return created;
  });
  if (wonAt) await refreshSnapshotsForDates(organizationId, [wonAt]);
  return { ok: true, deal, quote: { id: quote.id, folio: quote.folio } } as const;
}
