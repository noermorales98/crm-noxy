// Borradores de correo: reglas puras (sin base de datos) para crearlos, editarlos y decidir si ya se pueden enviar.

export const NO_SUBJECT = "(sin asunto)";
const MAX_BODY = 300_000;
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texto plano → HTML simple: párrafos por línea en blanco, saltos por línea. */
export function textToHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** HTML simple → texto plano (para la versión sin formato del correo). */
function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

export type DraftData = { toAddress: string; ccAddress: string | null; subject: string; bodyHtml: string; bodyText: string };
export type DraftResult = { ok: true; data: DraftData } | { ok: false; error: string; data?: undefined };

const str = (v: unknown): string | null => (v === undefined || v === null ? "" : typeof v === "string" ? v : null);

/** Valida y normaliza lo que llega de la IA o de la pantalla. El destinatario y el asunto pueden faltar: es un borrador. */
export function normalizeDraft(input: unknown): DraftResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Datos del borrador inválidos" };
  const i = input as Record<string, unknown>;
  const to = str(i.to), cc = str(i.cc), subject = str(i.subject), body = str(i.body), html = str(i.bodyHtml);
  if (to === null || cc === null || subject === null || body === null || html === null) return { ok: false, error: "Los campos del borrador deben ser texto" };
  if (body.length > MAX_BODY || html.length > MAX_BODY) return { ok: false, error: "El cuerpo es demasiado largo" };
  const bodyHtml = html.trim() ? html : textToHtml(body);
  const bodyText = html.trim() ? htmlToText(html) : body.trim();
  return {
    ok: true,
    data: { toAddress: to.trim(), ccAddress: cc.trim() || null, subject: subject.trim() || NO_SUBJECT, bodyHtml, bodyText },
  };
}

/** ¿Falta algo para poder enviarlo? Devuelve qué falta, en palabras para la persona. */
export function draftReadyToSend(d: { toAddress: string; subject: string; bodyHtml: string }): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  const recipients = d.toAddress.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (recipients.length === 0) missing.push("destinatario");
  else if (!recipients.every((r) => EMAIL_RE.test(r))) missing.push("un destinatario válido");
  if (!d.subject.trim() || d.subject === NO_SUBJECT) missing.push("asunto");
  if (!d.bodyHtml.trim()) missing.push("mensaje");
  return { ready: missing.length === 0, missing };
}
