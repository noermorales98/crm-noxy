import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { effectiveQuoteStatus, resolveQuoteSender } from "@/src/lib/quotes";

/** Vista pública de una cotización (sin auth, por token). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: {
        items: { orderBy: { order: "asc" } },
        senderCompany: { select: { id: true, name: true, website: true, smtpFromEmail: true } },
      },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    const settings = await prisma.quoteSettings.findUnique({
      where: { organizationId: quote.organizationId },
    });

    const status = effectiveQuoteStatus(quote);
    const sender = resolveQuoteSender(settings, quote.senderCompany as any);

    // Registrar primera vista del cliente (solo si sigue en ENVIADA)
    if (quote.status === "ENVIADA") {
      const alreadySeen = await prisma.quoteEvent.findFirst({
        where: { quoteId: quote.id, type: "VISTA" },
      });
      if (!alreadySeen) {
        await prisma.quoteEvent.create({
          data: {
            type: "VISTA",
            description: "El cliente abrió la cotización",
            actor: "cliente",
            quoteId: quote.id,
            organizationId: quote.organizationId,
          },
        });
      }
    }

    return NextResponse.json({
      folio: quote.folio,
      status,
      currency: quote.currency,
      issuedAt: quote.issuedAt,
      validUntil: quote.validUntil,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      items: quote.items,
      taxRate: quote.taxRate,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      stripePaymentLinkUrl: quote.status === "ACEPTADA" ? quote.stripePaymentLinkUrl : null,
      paymentMethod: quote.paymentMethod,
      paidAt: quote.paidAt,
      bank: quote.status === "ACEPTADA"
        ? {
            bankName: sender.bankName,
            bankBeneficiary: sender.bankBeneficiary,
            bankClabe: sender.bankClabe,
            bankReference: sender.bankReference || quote.folio,
          }
        : null,
      sender: {
        businessName: sender.businessName,
        logoUrl: sender.logoUrl,
        taxId: sender.taxId,
        address: sender.address,
        phone: sender.phone,
        email: sender.email,
        website: sender.website,
      },
    });
  } catch (error) {
    console.error("GET /api/public/quotes/[token] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
