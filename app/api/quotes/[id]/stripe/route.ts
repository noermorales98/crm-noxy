import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { createQuoteStripeLink } from "@/src/lib/quotes";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await prisma.quote.findFirst({
      where: { organizationId, OR: [{ id }, { folio: id }] },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    const url = await createQuoteStripeLink(quote.id);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("POST /api/quotes/[id]/stripe error:", error);
    return NextResponse.json({ error: error.message || "Error generando link de Stripe" }, { status: 500 });
  }
}
