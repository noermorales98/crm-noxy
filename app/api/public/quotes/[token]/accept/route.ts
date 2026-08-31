import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createQuoteStripeLinks, formatMoney, isQuoteExpired, notifyQuoteEvent, quotePublicUrl, QuoteStripeLinks } from "@/src/lib/quotes";

/** El cliente acepta la cotización desde la vista pública. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: { senderCompany: true },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    if (quote.status === "PAGADA") {
      return NextResponse.json({ error: "Esta cotización ya fue pagada", status: "PAGADA" }, { status: 409 });
    }
    if (quote.status === "RECHAZADA") {
      return NextResponse.json({ error: "Esta cotización fue rechazada", status: "RECHAZADA" }, { status: 409 });
    }
    if (quote.status === "BORRADOR") {
      return NextResponse.json({ error: "Esta cotización aún no ha sido enviada", status: "BORRADOR" }, { status: 409 });
    }
    if (quote.status === "VENCIDA") {
      return NextResponse.json({ error: "Esta cotización está vencida", status: "VENCIDA" }, { status: 409 });
    }
    if (quote.status === "ENVIADA" && isQuoteExpired(quote)) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "VENCIDA",
          events: { create: { type: "VENCIDA", description: "La cotización expiró", actor: "crm", organizationId: quote.organizationId } },
        },
      });
      return NextResponse.json({ error: "Esta cotización está vencida", status: "VENCIDA" }, { status: 409 });
    }

    // Idempotente: si ya estaba aceptada, solo devolver los datos de pago
    if (quote.status !== "ACEPTADA") {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "ACEPTADA",
          acceptedAt: new Date(),
          events: {
            create: {
              type: "ACEPTADA",
              description: "El cliente aceptó la cotización",
              actor: "cliente",
              organizationId: quote.organizationId,
            },
          },
        },
      });

      await notifyQuoteEvent({
        company: quote.senderCompany,
        toOwner: quote.notifyEmail,
        ownerSubject: `Cotización aceptada — ${quote.folio}`,
        ownerBody: `<p><strong>${quote.clientName}</strong> aceptó la cotización <strong>${quote.folio}</strong>
          por ${formatMoney(quote.total, quote.currency)}.</p>
          <p><a href="${quotePublicUrl(quote.publicToken)}">Ver cotización pública</a></p>`,
      });
    }

    // Intentar generar Payment Links de Stripe; si no está configurado, ofrecer transferencia
    let stripeUrl: string | null = null;
    let stripeError: string | null = null;
    let links: QuoteStripeLinks = {};
    try {
      links = await createQuoteStripeLinks(quote.id);
      stripeUrl = links.fullUrl || links.depositUrl || null;
    } catch (err: any) {
      stripeError = err.message || "No se pudo generar el link de pago";
    }

    const settings = await prisma.quoteSettings.findUnique({
      where: { organizationId: quote.organizationId },
    });

    return NextResponse.json({
      ok: true,
      status: "ACEPTADA",
      stripeUrl,
      stripeError,
      splitPayment: quote.splitPayment,
      depositUrl: links.depositUrl || null,
      finalUrl: links.finalUrl || null,
      depositAmount: links.depositAmount ?? null,
      finalAmount: links.finalAmount ?? null,
      bank: settings
        ? {
            bankName: settings.bankName,
            bankBeneficiary: settings.bankBeneficiary,
            bankClabe: settings.bankClabe,
            bankSwift: settings.bankSwift,
            bankReference: settings.bankReference || quote.folio,
          }
        : null,
    });
  } catch (error) {
    console.error("POST /api/public/quotes/[token]/accept error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
