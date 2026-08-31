import { prisma } from "@/src/lib/db";
import { sendEmail } from "@/src/lib/email";
import { getPublicBaseUrl } from "@/src/lib/url";
import nodemailer from "nodemailer";
import Stripe from "stripe";

export const QUOTE_STATUSES = ["BORRADOR", "ENVIADA", "ACEPTADA", "PAGADA", "VENCIDA", "RECHAZADA"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface QuoteItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // porcentaje 0–100
}

export interface QuoteTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
  items: { description: string; quantity: number; unitPrice: number; discount: number; total: number; order: number }[];
}

/** Calcula totales de la cotización a partir de los ítems y la tasa de impuesto. */
export function computeQuoteTotals(items: QuoteItemInput[], taxRate: number): QuoteTotals {
  const computed = items.map((item, i) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Math.min(100, Math.max(0, Number(item.discount) || 0));
    const total = Math.round(quantity * unitPrice * (1 - discount / 100) * 100) / 100;
    return { description: String(item.description || "").trim(), quantity, unitPrice, discount, total, order: i };
  });
  const subtotal = Math.round(computed.reduce((acc, it) => acc + it.total, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (Number(taxRate) / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total, items: computed };
}

/** Genera el siguiente folio consecutivo por organización (transaccional). */
export async function nextQuoteFolio(organizationId: string): Promise<{ folio: string; folioNumber: number }> {
  const settings = await prisma.quoteSettings.upsert({
    where: { organizationId },
    update: { quoteCounter: { increment: 1 } },
    create: { organizationId, quoteCounter: 1 },
  });
  const year = new Date().getFullYear();
  const folio = `COT-${year}-${String(settings.quoteCounter).padStart(4, "0")}`;
  return { folio, folioNumber: settings.quoteCounter };
}

/** Estado efectivo: una cotización ENVIADA con vigencia vencida se considera VENCIDA. */
export function effectiveQuoteStatus(quote: { status: string; validUntil: Date | null }): string {
  if (quote.status === "ENVIADA" && quote.validUntil && new Date(quote.validUntil).getTime() < Date.now()) {
    return "VENCIDA";
  }
  return quote.status;
}

export function isQuoteExpired(quote: { validUntil: Date | null }): boolean {
  return !!quote.validUntil && new Date(quote.validUntil).getTime() < Date.now();
}

export function quotePublicUrl(token: string): string {
  return `${getPublicBaseUrl()}/cotizar/${token}`;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── Remitente (empresa del CRM) ─────────────────────────────────────────────

export interface QuoteSenderCompany {
  id: string;
  name: string;
  website: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromEmail: string | null;
  smtpSecure: boolean | null;
}

/**
 * Resuelve los datos del remitente combinando la Empresa del CRM (si la hay)
 * con los datos fiscales/bancarios de la configuración de cotizaciones.
 */
export function resolveQuoteSender(
  settings: {
    businessName: string | null; logoUrl: string | null; taxId: string | null;
    address: string | null; phone: string | null; email: string | null; website: string | null;
    bankName: string | null; bankBeneficiary: string | null; bankClabe: string | null; bankSwift: string | null; bankReference: string | null;
  } | null,
  company: QuoteSenderCompany | null
) {
  return {
    businessName: company?.name || settings?.businessName || null,
    logoUrl: settings?.logoUrl || null,
    taxId: settings?.taxId || null,
    address: settings?.address || null,
    phone: settings?.phone || null,
    email: settings?.email || company?.smtpFromEmail || null,
    website: settings?.website || company?.website || null,
    bankName: settings?.bankName || null,
    bankBeneficiary: settings?.bankBeneficiary || null,
    bankClabe: settings?.bankClabe || null,
    bankSwift: settings?.bankSwift || null,
    bankReference: settings?.bankReference || null,
    companyId: company?.id || null,
    hasSmtp: !!(company?.smtpHost && company?.smtpUser && company?.smtpPass),
  };
}

/**
 * Envía un correo usando el SMTP de la empresa remitente (igual que el módulo
 * de correo del CRM). Si no hay empresa con SMTP, cae al SMTP global por
 * variables de entorno. Devuelve si el correo realmente se envió.
 */
export async function sendQuoteEmail(opts: {
  company: QuoteSenderCompany | null;
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const { company, to, subject, html } = opts;

  if (company?.smtpHost && company.smtpUser && company.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: company.smtpHost,
        port: company.smtpPort || 465,
        secure: company.smtpSecure ?? true,
        auth: { user: company.smtpUser, pass: company.smtpPass },
      });
      const info = await transporter.sendMail({
        from: `"${company.name}" <${company.smtpFromEmail || company.smtpUser}>`,
        to,
        subject,
        html,
      });
      console.log(`Quote email sent via company SMTP (${company.name}): ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("Failed to send quote email via company SMTP:", error);
      return false;
    }
  }

  // Fallback: SMTP global por variables de entorno
  return sendEmail({ to, subject, html });
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

/** Clave secreta de Stripe de la organización: BD primero, variable de entorno como respaldo. */
export async function getStripeSecretKey(organizationId: string): Promise<string | null> {
  const settings = await prisma.quoteSettings.findUnique({
    where: { organizationId },
    select: { stripeSecretKey: true },
  });
  return settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;
}

/** Secretos de webhook configurados (BD de todas las orgs + env), para verificar firmas. */
export async function getStripeWebhookSecrets(): Promise<string[]> {
  const secrets: string[] = [];
  if (process.env.STRIPE_WEBHOOK_SECRET) secrets.push(process.env.STRIPE_WEBHOOK_SECRET);
  const rows = await prisma.quoteSettings.findMany({
    where: { stripeWebhookSecret: { not: null } },
    select: { stripeWebhookSecret: true },
  });
  for (const row of rows) {
    if (row.stripeWebhookSecret && !secrets.includes(row.stripeWebhookSecret)) {
      secrets.push(row.stripeWebhookSecret);
    }
  }
  return secrets;
}

/** Crea (o reutiliza) un Payment Link de Stripe por el total de la cotización. */
export async function createQuoteStripeLink(quoteId: string): Promise<string> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Cotización no encontrada");

  if (quote.stripePaymentLinkUrl) return quote.stripePaymentLinkUrl;

  const secretKey = await getStripeSecretKey(quote.organizationId);
  if (!secretKey) {
    throw new Error("Stripe no está configurado. Agrega tu clave en Cotizaciones → Configuración.");
  }
  if (!Number.isFinite(quote.total) || quote.total <= 0) {
    throw new Error("La cotización no tiene un monto total válido");
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" });
  const baseUrl = getPublicBaseUrl();

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: quote.currency.toLowerCase(),
          unit_amount: Math.round(quote.total * 100),
          product_data: { name: `Cotización ${quote.folio} — ${quote.clientName}` },
        },
        quantity: 1,
      },
    ],
    after_completion: {
      type: "redirect",
      redirect: { url: `${baseUrl}/cotizar/${quote.publicToken}?pagado=1` },
    },
    metadata: { type: "quote", quoteId: quote.id, organizationId: quote.organizationId },
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: { stripePaymentLinkId: paymentLink.id, stripePaymentLinkUrl: paymentLink.url },
  });

  return paymentLink.url;
}

// ─── Notificaciones por correo ────────────────────────────────────────────────

const emailWrapper = (title: string, bodyHtml: string) => `
  <div style="font-family: -apple-system, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="font-size: 18px; margin: 0 0 12px;">${title}</h2>
    ${bodyHtml}
    <p style="font-size: 11px; color: #9ca3af; margin-top: 32px;">Enviado desde Noxy CRM</p>
  </div>
`;

export async function notifyQuoteEvent(opts: {
  company?: QuoteSenderCompany | null;
  toOwner?: string | null;
  toClient?: string | null;
  ownerSubject?: string;
  ownerBody?: string;
  clientSubject?: string;
  clientBody?: string;
}) {
  const jobs: Promise<unknown>[] = [];
  const company = opts.company ?? null;
  if (opts.toOwner && opts.ownerSubject && opts.ownerBody) {
    jobs.push(sendQuoteEmail({ company, to: opts.toOwner, subject: opts.ownerSubject, html: emailWrapper(opts.ownerSubject, opts.ownerBody) }));
  }
  if (opts.toClient && opts.clientSubject && opts.clientBody) {
    jobs.push(sendQuoteEmail({ company, to: opts.toClient, subject: opts.clientSubject, html: emailWrapper(opts.clientSubject, opts.clientBody) }));
  }
  await Promise.allSettled(jobs);
}
