import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { computeQuoteTotals, effectiveQuoteStatus } from "@/src/lib/quotes";

async function findQuote(idOrFolio: string, organizationId: string) {
  return prisma.quote.findFirst({
    where: { organizationId, OR: [{ id: idOrFolio }, { folio: idOrFolio }] },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await prisma.quote.findFirst({
      where: { organizationId, OR: [{ id }, { folio: id }] },
      include: {
        items: { orderBy: { order: "asc" } },
        events: { orderBy: { createdAt: "desc" } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        senderCompany: { select: { id: true, name: true, website: true, smtpHost: true } },
      },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    return NextResponse.json({ ...quote, status: effectiveQuoteStatus(quote) });
  } catch (error) {
    console.error("GET /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const existing = await findQuote(id, organizationId);
    if (!existing) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    if (existing.status !== "BORRADOR") {
      return NextResponse.json({ error: "Solo se pueden editar cotizaciones en borrador" }, { status: 409 });
    }

    const body = await req.json();
    const {
      contactId, clientName, clientCompany, clientEmail, clientPhone, clientAddress,
      currency, validUntil, taxRate, notes, terms, items, senderCompanyId,
      splitPayment, depositPercent,
    } = body;

    if (!clientName || !String(clientName).trim()) {
      return NextResponse.json({ error: "El nombre del cliente es requerido" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Agrega al menos un ítem a la cotización" }, { status: 400 });
    }
    for (const [i, item] of items.entries()) {
      if (!item.description || !String(item.description).trim()) {
        return NextResponse.json({ error: `El ítem ${i + 1} no tiene descripción` }, { status: 400 });
      }
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        return NextResponse.json({ error: `El ítem ${i + 1} no tiene un precio unitario válido` }, { status: 400 });
      }
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return NextResponse.json({ error: `El ítem ${i + 1} no tiene una cantidad válida` }, { status: 400 });
      }
    }
    const rate = taxRate != null ? Number(taxRate) : existing.taxRate;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: "La tasa de impuesto debe ser un número entre 0 y 100" }, { status: 400 });
    }

    // Cobro en dos parcialidades (anticipo + pago final)
    const split = splitPayment === true;
    const deposit = depositPercent != null ? Number(depositPercent) : 50;
    if (split && (!Number.isFinite(deposit) || deposit <= 0 || deposit >= 100)) {
      return NextResponse.json({ error: "El porcentaje de anticipo debe ser mayor a 0 y menor a 100" }, { status: 400 });
    }
    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId } });
      if (!contact) return NextResponse.json({ error: "Contacto inválido" }, { status: 400 });
    }
    if (senderCompanyId) {
      const company = await prisma.company.findFirst({ where: { id: senderCompanyId, organizationId } });
      if (!company) return NextResponse.json({ error: "Empresa remitente inválida" }, { status: 400 });
    }

    const totals = computeQuoteTotals(items, rate);

    const quote = await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      const updated = await tx.quote.update({
        where: { id: existing.id },
        data: {
          contactId: contactId || null,
          senderCompanyId: senderCompanyId || null,
          clientName: String(clientName).trim(),
          clientCompany: clientCompany || null,
          clientEmail: clientEmail || null,
          clientPhone: clientPhone || null,
          clientAddress: clientAddress || null,
          currency: currency || existing.currency,
          validUntil: validUntil ? new Date(validUntil) : null,
          taxRate: rate,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          notes: notes || null,
          terms: terms || null,
          splitPayment: split,
          depositPercent: split ? deposit : 50,
          items: { create: totals.items },
        },
        include: { items: { orderBy: { order: "asc" } } },
      });
      await tx.quoteEvent.create({
        data: { type: "EDITADA", description: "Cotización editada", actor: "crm", quoteId: existing.id, organizationId },
      });
      return updated;
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("PUT /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const existing = await findQuote(id, organizationId);
    if (!existing) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    // Las cotizaciones pagadas requieren confirmación explícita (?force=true)
    if (existing.status === "PAGADA") {
      const force = new URL(req.url).searchParams.get("force") === "true";
      if (!force) {
        return NextResponse.json(
          { error: "La cotización está pagada. Confirma explícitamente para eliminarla.", requiresForce: true },
          { status: 409 }
        );
      }
    }

    await prisma.quote.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
