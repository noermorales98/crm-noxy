/** Seguro para el navegador y el servidor: sin Prisma, nodemailer ni imports con alias (así lo prueba node --test). */

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const QUOTE_ATTACHMENT_MAX_FILES = 5;
export const QUOTE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // por archivo
export const QUOTE_ATTACHMENT_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export interface QuoteEmailQuote {
  folio: string;
  clientName: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil?: string | Date | null;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultQuoteSubject(folio: string, businessName: string): string {
  return `Cotización ${folio} — ${businessName}`;
}

/** Mensaje por defecto (texto plano) que el usuario puede reescribir antes de enviar. */
export function defaultQuoteMessage(quote: Pick<QuoteEmailQuote, "folio" | "clientName" | "total" | "currency" | "validUntil">): string {
  const vigencia = quote.validUntil
    ? `, vigente hasta el ${new Date(quote.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`
    : "";
  return `Hola ${quote.clientName},\n\nTe compartimos la cotización ${quote.folio} por un total de ${formatMoney(quote.total, quote.currency)}${vigencia}.`;
}

export function renderQuoteEmailHtml(opts: {
  quote: QuoteEmailQuote;
  businessName: string;
  publicUrl: string;
  message: string;
}): string {
  const { quote, businessName, publicUrl, message } = opts;
  const body = escapeHtml(message.trim())
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const itemRows = quote.items
    .map(
      (it) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${escapeHtml(it.description)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatMoney(it.unitPrice, quote.currency)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatMoney(it.total, quote.currency)}</td>
        </tr>`
    )
    .join("");

  return `
      <div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="margin:0 0 4px;">Cotización ${escapeHtml(quote.folio)}</h2>
        <p style="color:#6b7280;margin:0 0 20px;">${escapeHtml(businessName)}</p>
        ${body}
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
}
