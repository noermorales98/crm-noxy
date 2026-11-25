// Arma el prompt de sistema del asistente. Puro: sin red ni base de datos.
//
// Regla de fondo: el registro que la persona tiene abierto (cita, deal, contacto…) es lo MÁS importante y nunca se recorta
// por culpa del resumen general del CRM. Antes iba al final y un recorte a 16 000 caracteres podía cortarlo.

/** Caracteres del resumen del CRM + lo relevante para la pregunta (sin contar el registro abierto ni las instrucciones). */
export const CONTEXT_BUDGET = 16_000;
/** Tope del registro abierto: lo bastante grande para varias notas completas. */
export const RECORD_BUDGET = 9_000;
/** El resumen general nunca baja de esto aunque el registro sea largo. */
const MIN_SUMMARY = 4_000;
/** Lo relevante para la pregunta (marca mencionada, coincidencias) tiene su propio lugar. */
const RELEVANT_BUDGET = 4_000;

const clean = (text: string) => text.replace(/[═─┌┐└┘├┤┬┴┼│]/g, "-").replace(/•/g, "-");

const REFERENCE_RULES = [
  "=== REGISTRO ABIERTO (PRIORIDAD MÁXIMA) ===",
  "La persona está viendo ahora el registro que aparece abajo. Cuando diga «esta cita», «esta persona», «este contacto», «este deal», «esta cotización», «aquí», «esto» o «él/ella» sin dar un nombre, se refiere a ESE registro: úsalo y NO preguntes a quién se refiere.",
  "Si falta un dato (por ejemplo el correo del destinatario), dilo claramente; nunca lo inventes. Si lo único que falta es el correo, redacta igual el mensaje con lo que sí sabes del registro (las notas, lo acordado, los pasos) y deja vacío el campo «to» de la tarjeta para que la persona lo complete. No pidas el tema si el registro ya lo dice.",
].join("\n");

export type PromptParts = {
  /** Resumen general del CRM (el más largo y el primero en recortarse). */
  summary: string;
  /** Registro abierto, ya armado por `buildPageRecordContext` (vacío si la pantalla no es de un registro). */
  record: string;
  /** Marca mencionada y coincidencias con las palabras del mensaje. */
  relevant: string;
  /** «Contexto de página actual»: la etiqueta de la pantalla. */
  pageSection: string;
  /** Instrucciones de acciones. */
  actions: string;
};

export function assembleSystemPrompt({ summary, record, relevant, pageSection, actions }: PromptParts): string {
  const rec = clean(record).trim().slice(0, RECORD_BUDGET);
  const rel = clean(relevant).slice(0, RELEVANT_BUDGET);
  const summaryBudget = Math.max(MIN_SUMMARY, CONTEXT_BUDGET - rel.length - (rec ? Math.min(rec.length, RECORD_BUDGET) : 0));
  const sum = clean(summary).slice(0, summaryBudget);

  return [rec ? `${REFERENCE_RULES}\n${rec}` : "", sum, rel.trim(), pageSection.trim(), actions]
    .filter(Boolean)
    .join("\n\n");
}
