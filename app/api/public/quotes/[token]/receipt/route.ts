import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { formatMoney, notifyQuoteEvent } from "@/src/lib/quotes";

/** El cliente reporta su comprobante de transferencia (referencia / nota). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: { senderCompany: true },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    if (quote.status === "PAGADA") {
      return NextResponse.json({ error: "Esta cotización ya está pagada" }, { status: 409 });
    }
    if (quote.status !== "ACEPTADA") {
      return NextResponse.json({ error: "Primero debes aceptar la cotización para reportar un pago" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const reference = body.reference ? String(body.reference).trim().slice(0, 500) : "";
    if (!reference) {
      return NextResponse.json({ error: "Ingresa la referencia o los datos del comprobante" }, { status: 400 });
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        paymentMethod: "transferencia",
        transferReference: reference,
        events: {
          create: {
            type: "COMPROBANTE_SUBIDO",
            description: `Comprobante reportado por el cliente: ${reference}`,
            actor: "cliente",
            organizationId: quote.organizationId,
          },
        },
      },
    });

    await notifyQuoteEvent({
      company: quote.senderCompany,
      toOwner: quote.notifyEmail,
      ownerSubject: `Comprobante recibido — ${quote.folio}`,
      ownerBody: `<p><strong>${quote.clientName}</strong> reportó un pago por transferencia para la cotización
        <strong>${quote.folio}</strong> (${formatMoney(quote.total, quote.currency)}).</p>
        <p>Referencia: ${reference}</p>
        <p>Confirma el pago desde el detalle de la cotización en el CRM.</p>`,
      toClient: quote.clientEmail,
      clientSubject: `Recibimos tu comprobante — ${quote.folio}`,
      clientBody: `<p>Hola ${quote.clientName},</p>
        <p>Recibimos tu comprobante de pago para la cotización <strong>${quote.folio}</strong>.
        Te notificaremos cuando el pago sea confirmado.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/public/quotes/[token]/receipt error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
