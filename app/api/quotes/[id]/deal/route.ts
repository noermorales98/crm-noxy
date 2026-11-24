import { NextResponse, after } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { autoSync } from "@/src/lib/notion-sync";
import { refreshSnapshotsForDates } from "@/src/lib/month-close-service";
import { saleDateChoices } from "@/src/lib/quote-sales";

/**
 * Crea un deal a partir de una cotización y la vincula. Body: `{ stageId, title?, saleDate? }`.
 * El deal nace con el cliente, la moneda y el total de la cotización. Si la etapa es ganada, su fecha de venta es UNA:
 * si la cotización trae fechas distintas (aceptada, pagada…) responde 409 con las opciones para que se elija cuál es la correcta,
 * y la petición se repite con `saleDate`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await prisma.quote.findFirst({ where: { organizationId, OR: [{ id }, { folio: id }] } });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    if (quote.dealId) return NextResponse.json({ error: "La cotización ya está vinculada a un deal" }, { status: 409 });

    const body = (await req.json().catch(() => ({}))) as { stageId?: string; title?: string; saleDate?: string };
    if (!body.stageId) return NextResponse.json({ error: "Elige la etapa del deal" }, { status: 400 });
    const stage = await prisma.stage.findFirst({ where: { id: body.stageId, pipeline: { organizationId } }, select: { id: true, pipelineId: true, isWon: true, isLost: true } });
    if (!stage) return NextResponse.json({ error: "Etapa no válida" }, { status: 404 });
    if (stage.isLost) return NextResponse.json({ error: "Un deal nuevo no puede nacer como perdido" }, { status: 400 });

    let wonAt: Date | null = null;
    if (stage.isWon) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
      const choices = saleDateChoices(quote, null, org?.timezone || "America/Cancun");
      if (body.saleDate) {
        const picked = choices.find((choice) => choice.value === body.saleDate);
        if (!picked) return NextResponse.json({ error: "Esa fecha no es una de las de la cotización" }, { status: 400 });
        wonAt = new Date(picked.value);
      } else if (choices.length > 1) {
        return NextResponse.json({ error: "La cotización tiene fechas distintas: elige cuál es la de la venta", needsDate: true, choices }, { status: 409 });
      } else {
        wonAt = choices[0] ? new Date(choices[0].value) : new Date();
      }
    }

    const title = body.title?.trim() || quote.clientName;
    const deal = await prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          title,
          value: quote.total,
          currency: quote.currency,
          stageId: stage.id,
          pipelineId: stage.pipelineId,
          organizationId,
          contactId: quote.contactId,
          wonAt,
        },
        select: { id: true, title: true, wonAt: true },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { dealId: created.id } });
      return created;
    });

    after(() => autoSync(organizationId, "deal", deal.id));
    if (wonAt) await refreshSnapshotsForDates(organizationId, [wonAt]);
    return NextResponse.json({ deal, quote: { id: quote.id, folio: quote.folio } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes/[id]/deal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
