import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { formatMoney, notifyQuoteEvent } from "@/src/lib/quotes";

/** Confirma manualmente el pago de una cotización (p. ej. transferencia bancaria). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await prisma.quote.findFirst({
      where: { organizationId, OR: [{ id }, { folio: id }] },
      include: { senderCompany: true },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    if (quote.status === "PAGADA") {
      return NextResponse.json({ error: "La cotización ya está pagada" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const reference = body.reference || quote.transferReference || null;
    const method = body.method || quote.paymentMethod || "transferencia";

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "PAGADA",
        paidAt: new Date(),
        paymentMethod: method,
        transferReference: reference,
        events: {
          create: {
            type: "PAGO_CONFIRMADO",
            description: `Pago confirmado manualmente (${method})${reference ? ` · Ref: ${reference}` : ""} por ${session.user.email || "el equipo"}`,
            actor: "crm",
            organizationId,
          },
        },
      },
    });

    await notifyQuoteEvent({
      company: quote.senderCompany,
      toClient: quote.clientEmail,
      clientSubject: `Pago confirmado — Cotización ${quote.folio}`,
      clientBody: `<p>Hola ${quote.clientName},</p>
        <p>Confirmamos la recepción de tu pago por <strong>${formatMoney(quote.total, quote.currency)}</strong>
        correspondiente a la cotización <strong>${quote.folio}</strong>.</p>
        <p>¡Gracias por tu preferencia!</p>`,
    });

    return NextResponse.json({ ok: true, status: updated.status, paidAt: updated.paidAt });
  } catch (error) {
    console.error("POST /api/quotes/[id]/pago error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
