import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { autoSync } from "@/src/lib/notion-sync";
import { createDealFromQuote, findQuoteForLink } from "@/src/lib/quote-deal-link";

/**
 * Crea un deal a partir de una cotización y la vincula. Body: `{ stageId, title?, saleDate? }`.
 * Si la etapa es ganada y la cotización trae fechas distintas, responde 409 con las opciones y se repite con `saleDate`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await findQuoteForLink(organizationId, id);
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { stageId?: string; title?: string; saleDate?: string };
    if (!body.stageId) return NextResponse.json({ error: "Elige la etapa del deal" }, { status: 400 });

    const result = await createDealFromQuote({ organizationId, quote, stageId: body.stageId, title: body.title, saleDate: body.saleDate });
    if (!result.ok) return NextResponse.json({ error: result.error, ...(result.needsDate ? { needsDate: true, choices: result.choices } : {}) }, { status: result.status });
    after(() => autoSync(organizationId, "deal", result.deal.id));
    return NextResponse.json({ deal: result.deal, quote: result.quote }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes/[id]/deal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
