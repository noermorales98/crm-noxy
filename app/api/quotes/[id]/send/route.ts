import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { quotePublicUrl, effectiveQuoteStatus, sendQuoteEmail } from "@/src/lib/quotes";
import {
  QUOTE_ATTACHMENT_MAX_BYTES,
  QUOTE_ATTACHMENT_MAX_FILES,
  QUOTE_ATTACHMENT_MAX_TOTAL_BYTES,
  defaultQuoteMessage,
  defaultQuoteSubject,
  renderQuoteEmailHtml,
} from "@/src/lib/quote-email";

type Ctx = { params: Promise<{ id: string }> };

/** Carga la cotización y resuelve remitente y reglas de envío. Devuelve error ya formateado si no se puede enviar. */
async function loadSendContext(params: Ctx["params"]) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const organizationId = (session as any).currentOrganizationId;
  if (!organizationId) return { error: NextResponse.json({ error: "No organization context" }, { status: 400 }) };

  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: { organizationId, OR: [{ id }, { folio: id }] },
    include: { items: { orderBy: { order: "asc" } }, senderCompany: true },
  });
  if (!quote) return { error: NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 }) };

  const current = effectiveQuoteStatus(quote);
  if (current === "PAGADA" || current === "RECHAZADA" || current === "VENCIDA") {
    return { error: NextResponse.json({ error: `No se puede enviar una cotización en estado ${current.toLowerCase()}` }, { status: 409 }) };
  }
  if (!quote.clientEmail) {
    return { error: NextResponse.json({ error: "La cotización no tiene correo de cliente. Edítala para agregarlo." }, { status: 400 }) };
  }

  const settings = await prisma.quoteSettings.findUnique({
    where: { organizationId },
    include: { defaultSenderCompany: true },
  });
  // Empresa emisora del correo: la de la cotización o la default configurada
  const emailCompany = quote.senderCompany ?? settings?.defaultSenderCompany ?? null;
  const businessName = emailCompany?.name || settings?.businessName || "Noxy CRM";
  return { organizationId, quote, emailCompany, businessName, publicUrl: quotePublicUrl(quote.publicToken) };
}

/** Borrador del correo: destinatario, asunto, mensaje y HTML para la vista previa. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await loadSendContext(params);
    if ("error" in ctx && ctx.error) return ctx.error;
    const { quote, businessName, publicUrl, emailCompany } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
    const message = defaultQuoteMessage(quote);
    return NextResponse.json({
      to: quote.clientEmail,
      subject: defaultQuoteSubject(quote.folio, businessName),
      message,
      businessName,
      publicUrl,
      fromName: emailCompany?.name ?? businessName,
      html: renderQuoteEmailHtml({ quote, businessName, publicUrl, message }),
      limits: { maxFiles: QUOTE_ATTACHMENT_MAX_FILES, maxFileBytes: QUOTE_ATTACHMENT_MAX_BYTES, maxTotalBytes: QUOTE_ATTACHMENT_MAX_TOTAL_BYTES },
    });
  } catch (error) {
    console.error("GET /api/quotes/[id]/send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Envía la cotización. Acepta multipart (subject, message, files[]) o sin cuerpo (usa el borrador por defecto). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await loadSendContext(params);
    if ("error" in ctx && ctx.error) return ctx.error;
    const { organizationId, quote, businessName, publicUrl, emailCompany } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    let subject = defaultQuoteSubject(quote.folio, businessName);
    let message = defaultQuoteMessage(quote);
    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];

    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const form = await req.formData();
      const subjectField = form.get("subject");
      const messageField = form.get("message");
      if (typeof subjectField === "string") subject = subjectField.trim();
      if (typeof messageField === "string") message = messageField;
      if (!subject) return NextResponse.json({ error: "El asunto no puede estar vacío" }, { status: 400 });
      if (subject.length > 300) return NextResponse.json({ error: "El asunto es demasiado largo" }, { status: 400 });
      if (message.length > 10000) return NextResponse.json({ error: "El mensaje es demasiado largo" }, { status: 400 });

      const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
      if (files.length > QUOTE_ATTACHMENT_MAX_FILES) {
        return NextResponse.json({ error: `Máximo ${QUOTE_ATTACHMENT_MAX_FILES} archivos adjuntos` }, { status: 400 });
      }
      let total = 0;
      for (const file of files) {
        if (file.size > QUOTE_ATTACHMENT_MAX_BYTES) {
          return NextResponse.json({ error: `«${file.name}» supera el límite de ${QUOTE_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB` }, { status: 400 });
        }
        total += file.size;
        if (total > QUOTE_ATTACHMENT_MAX_TOTAL_BYTES) {
          return NextResponse.json({ error: `Los adjuntos superan ${QUOTE_ATTACHMENT_MAX_TOTAL_BYTES / 1024 / 1024} MB en total` }, { status: 400 });
        }
        attachments.push({
          filename: file.name.replace(/[\\/\r\n]/g, "_") || "adjunto",
          content: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || undefined,
        });
      }
    }

    const html = renderQuoteEmailHtml({ quote, businessName, publicUrl, message });
    const sent = await sendQuoteEmail({
      company: emailCompany,
      to: quote.clientEmail!,
      subject,
      html,
      attachments: attachments.length ? attachments : undefined,
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
              ? `Enviada por correo a ${quote.clientEmail}${viaCompany ? ` (SMTP de ${emailCompany!.name})` : ""}${attachments.length ? ` con ${attachments.length} adjunto(s)` : ""}`
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
