import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { quotePublicUrl, formatMoney, effectiveQuoteStatus, sendQuoteEmail } from "@/src/lib/quotes";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const { id } = await params;
    const quote = await prisma.quote.findFirst({
      where: { organizationId, OR: [{ id }, { folio: id }] },
      include: { items: { orderBy: { order: "asc" } }, senderCompany: true },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    const current = effectiveQuoteStatus(quote);
    if (current === "PAGADA" || current === "RECHAZADA" || current === "VENCIDA") {
      return NextResponse.json({ error: `No se puede enviar una cotización en estado ${current.toLowerCase()}` }, { status: 409 });
    }
    if (!quote.clientEmail) {
      return NextResponse.json({ error: "La cotización no tiene correo de cliente. Edítala para agregarlo." }, { status: 400 });
    }

    const publicUrl = quotePublicUrl(quote.publicToken);
    const settings = await prisma.quoteSettings.findUnique({
      where: { organizationId },
      include: { defaultSenderCompany: true },
    });
    // Empresa emisora del correo: la de la cotización o la default configurada
    const emailCompany = quote.senderCompany ?? settings?.defaultSenderCompany ?? null;
    const businessName = emailCompany?.name || settings?.businessName || "Noxy CRM";

    const itemRows = quote.items
      .map(
        (it) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${it.description}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatMoney(it.unitPrice, quote.currency)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatMoney(it.total, quote.currency)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="margin:0 0 4px;">Cotización ${quote.folio}</h2>
        <p style="color:#6b7280;margin:0 0 20px;">${businessName}</p>
        <p>Hola ${quote.clientName},</p>
        <p>Te compartimos la cotización <strong>${quote.folio}</strong> por un total de
        <strong>${formatMoney(quote.total, quote.currency)}</strong>${quote.validUntil ? `, vigente hasta el <strong>${new Date(quote.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</strong>` : ""}.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead>
            <tr style="color:#6b7280;font-size:11px;text-transform:uppercase;">
              <th style="text-align:left;padding-bottom:6px;">Descripción</th>
              <th style="text-align:center;padding-bottom:6px;">Cant.</th>
              <th style="text-align:right;padding-bottom:6px;">P. unitario</th>
              <th style="text-align:right;padding-bottom:6px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="text-align:right;font-size:14px;">
          Subtotal: ${formatMoney(quote.subtotal, quote.currency)}<br/>
          Impuestos (${quote.taxRate}%): ${formatMoney(quote.taxAmount, quote.currency)}<br/>
          <strong>Total: ${formatMoney(quote.total, quote.currency)}</strong>
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${publicUrl}" style="background:#1f2937;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver cotización y pagar
          </a>
        </div>
        <p style="font-size:12px;color:#9ca3af;">Si el botón no funciona, copia este enlace: ${publicUrl}</p>
      </div>
    `;

    const sent = await sendQuoteEmail({
      company: emailCompany,
      to: quote.clientEmail,
      subject: `Cotización ${quote.folio} — ${businessName}`,
      html,
    });

    const viaCompany = !!(emailCompany?.smtpHost && emailCompany.smtpUser && emailCompany.smtpPass);
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "ENVIADA",
        events: {
          create: {
            type: "ENVIADA",
            description: sent
              ? `Enviada por correo a ${quote.clientEmail}${viaCompany ? ` (SMTP de ${emailCompany!.name})` : ""}`
              : `Marcada como enviada (el correo a ${quote.clientEmail} no pudo enviarse — ${
                  viaCompany
                    ? `revisa el SMTP de ${emailCompany!.name}`
                    : "la empresa remitente no tiene SMTP configurado; configúralo en Empresas o define SMTP_* en el entorno"
                })`,
            actor: "crm",
            organizationId,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, emailSent: sent, viaCompany, publicUrl, status: updated.status });
  } catch (error) {
    console.error("POST /api/quotes/[id]/send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
