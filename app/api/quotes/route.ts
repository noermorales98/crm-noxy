import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { computeQuoteTotals, nextQuoteFolio, effectiveQuoteStatus, QUOTE_STATUSES } from "@/src/lib/quotes";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const contactId = searchParams.get("contactId");

    const where: any = { organizationId };
    if (contactId) where.contactId = contactId;
    if (status && (QUOTE_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.issuedAt.lte = end;
      }
    }
    if (q) {
      where.OR = [
        { folio: { contains: q } },
        { clientName: { contains: q } },
        { clientCompany: { contains: q } },
        { clientEmail: { contains: q } },
      ];
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(quotes.map((quote) => ({ ...quote, status: effectiveQuoteStatus(quote) })));
  } catch (error) {
    console.error("GET /api/quotes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const body = await req.json();
    const {
      contactId, clientName, clientCompany, clientEmail, clientPhone, clientAddress,
      currency, validUntil, taxRate, notes, terms, items, status, senderCompanyId,
      splitPayment, depositPercent,
    } = body;

    // ── Validaciones ────────────────────────────────────────────────────────
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
    const rate = taxRate != null ? Number(taxRate) : 16;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: "La tasa de impuesto debe ser un número entre 0 y 100" }, { status: 400 });
    }

    // Cobro en dos parcialidades (anticipo + pago final)
    const split = splitPayment === true;
    const deposit = depositPercent != null ? Number(depositPercent) : 50;
    if (split && (!Number.isFinite(deposit) || deposit <= 0 || deposit >= 100)) {
      return NextResponse.json({ error: "El porcentaje de anticipo debe ser mayor a 0 y menor a 100" }, { status: 400 });
    }

    // Verificar contacto dentro de la organización
    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId } });
      if (!contact) return NextResponse.json({ error: "Contacto inválido" }, { status: 400 });
    }

    // Empresa remitente: la elegida o la default de la configuración (ambas opcionales)
    let resolvedSenderCompanyId: string | null = null;
    if (senderCompanyId) {
      const company = await prisma.company.findFirst({ where: { id: senderCompanyId, organizationId } });
      if (!company) return NextResponse.json({ error: "Empresa remitente inválida" }, { status: 400 });
      resolvedSenderCompanyId = company.id;
    } else {
      const settings = await prisma.quoteSettings.findUnique({
        where: { organizationId },
        select: { defaultSenderCompanyId: true },
      });
      resolvedSenderCompanyId = settings?.defaultSenderCompanyId ?? null;
    }

    const totals = computeQuoteTotals(items, rate);
    const { folio, folioNumber } = await nextQuoteFolio(organizationId);

    const quote = await prisma.quote.create({
      data: {
        folio,
        folioNumber,
        status: status === "ENVIADA" ? "ENVIADA" : "BORRADOR",
        currency: currency || "MXN",
        validUntil: validUntil ? new Date(validUntil) : null,
        contactId: contactId || null,
        senderCompanyId: resolvedSenderCompanyId,
        clientName: String(clientName).trim(),
        clientCompany: clientCompany || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        taxRate: rate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: notes || null,
        terms: terms || null,
        splitPayment: split,
        depositPercent: split ? deposit : 50,
        notifyEmail: session.user.email || null,
        createdById: session.user.id || null,
        organizationId,
        items: { create: totals.items },
        events: {
          create: {
            type: "CREADA",
            description: `Cotización ${folio} creada`,
            actor: "crm",
            organizationId,
          },
        },
      },
      include: { items: { orderBy: { order: "asc" } }, events: true },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
