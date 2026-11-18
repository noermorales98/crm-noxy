/**
 * Solicitud de demo desde la landing pública. Funciones puras: validar, limpiar y adaptar el envío a los campos del
 * formulario «Demo de Noxy CRM» que vive en el CRM (así cada solicitud sigue el flujo normal de un lead).
 */

export const DEMO_FORM_NAME = "Demo de Noxy CRM";

export type DemoRequest = { name: string; email: string; company: string; phone: string; message: string };

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

/** Texto de una línea sin etiquetas ni caracteres de control (los envíos se muestran en correos y avisos). */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

/** El mensaje conserva saltos de línea (máx. 3) pero también pierde etiquetas. */
function cleanMessage(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export type DemoParse = { ok: true; value: DemoRequest } | { ok: false; error: string } | { ok: "bot" };

/**
 * Valida el cuerpo. El campo trampa `website` debe llegar vacío: una persona nunca lo ve ni lo llena; un robot sí.
 * En ese caso se responde como si todo hubiera salido bien (`ok: "bot"`) pero no se crea nada.
 */
export function parseDemoRequest(body: unknown): DemoParse {
  if (!body || typeof body !== "object") return { ok: false, error: "Solicitud inválida." };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: "bot" };

  const name = clean(b.name, 120);
  const email = clean(b.email, 190).toLowerCase();
  const company = clean(b.company, 120);
  const phone = clean(b.phone, 40).replace(/[^\d+()\-\s.]/g, "").trim();
  const message = cleanMessage(b.message, 1000);

  if (name.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (!EMAIL.test(email)) return { ok: false, error: "Escribe un correo válido." };
  if (phone && phone.replace(/\D/g, "").length < 7) return { ok: false, error: "El teléfono parece incompleto." };
  return { ok: true, value: { name, email, company, phone, message } };
}

type FormFieldLike = { type: string; name: string; label: string };

/**
 * Adapta la solicitud a los campos reales del formulario por TIPO (no por un nombre fijo), de modo que si se edita el
 * formulario en el CRM la landing sigue funcionando: correo → EMAIL, teléfono → PHONE, mensaje → TEXTAREA,
 * empresa → TEXT cuyo nombre o etiqueta diga empresa/company, y cualquier otro TEXT → el nombre.
 */
export function buildFormSubmission(fields: FormFieldLike[], request: DemoRequest): Record<string, string> {
  const out: Record<string, string> = {};
  let nameAssigned = false;
  for (const field of fields) {
    const tag = `${field.name} ${field.label}`.toLowerCase();
    if (field.type === "EMAIL") out[field.name] = request.email;
    else if (field.type === "PHONE") {
      if (request.phone) out[field.name] = request.phone;
    } else if (field.type === "TEXTAREA") {
      if (request.message) out[field.name] = request.message;
    } else if (field.type === "TEXT") {
      if (/empresa|company|negocio/.test(tag)) {
        if (request.company) out[field.name] = request.company;
      } else if (!nameAssigned) {
        out[field.name] = request.name;
        nameAssigned = true;
      }
    }
  }
  return out;
}

/** Límite sencillo por dirección: máximo `limit` solicitudes por ventana. Devuelve `false` si ya se pasó. */
export function allowRequest(hits: Map<string, number[]>, key: string, now: number, limit = 5, windowMs = 60 * 60_000): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
