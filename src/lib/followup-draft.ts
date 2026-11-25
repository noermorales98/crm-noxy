// Seguimiento tras una cita: reglas puras (sin base de datos ni IA) para decidir si se redacta, desde qué empresa y leer lo que devuelve la IA.

export const FOLLOWUP_SYSTEM_PROMPT = `Eres quien da seguimiento comercial en un CRM. Con las notas de una reunión redactas UN correo breve de seguimiento, en español, listo para enviar.

Reglas:
- Dirígete a la persona de la cita por su nombre. Agradece la reunión y resume solo lo que SÍ aparece en las notas (acuerdos, próximos pasos, fechas).
- No inventes datos, precios, fechas, compromisos ni nombres que no estén en el contexto. Si no hay acuerdos claros, propón un siguiente paso sencillo y pregunta.
- Tono cercano y profesional, sin exageraciones. MÁXIMO 110 palabras en total: saludo, 2 párrafos cortos (gracias + lo acordado en una o dos frases + siguiente paso) y despedida. Sin listas ni viñetas. Firma como «Equipo Noxy Digital».
- Responde SOLO con un objeto JSON: {"subject":"asunto claro","body":"mensaje en texto plano; las líneas en blanco separan párrafos"}.`;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Empresa desde la que sale el seguimiento: «Noxy Digital» si tiene correo configurado; si no, la única con correo; si no hay una clara, ninguna. */
export function pickFollowupCompany<T extends { id: string; name: string; smtpHost: string | null }>(companies: T[]): T | null {
  const withSmtp = companies.filter((c) => c.smtpHost);
  const noxy = withSmtp.find((c) => norm(c.name) === "noxy digital");
  if (noxy) return noxy;
  return withSmtp.length === 1 ? withSmtp[0] : null;
}

/** Saca {subject, body} de la respuesta de la IA (con o sin texto alrededor o bloque de código). */
export function parseFollowupJson(raw: string): { subject: string; body: string } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as { subject?: unknown; body?: unknown };
    if (typeof o.subject !== "string" || typeof o.body !== "string") return null;
    const subject = o.subject.trim(), body = o.body.trim();
    return subject && body ? { subject, body } : null;
  } catch {
    return null;
  }
}

export function shouldDraftFollowup(a: { status: string; followupDraftedAt: Date | null; notesText: string; hasPerson: boolean }): boolean {
  return !a.followupDraftedAt && a.status !== "CANCELLED" && a.notesText.trim().length > 0 && a.hasPerson;
}
