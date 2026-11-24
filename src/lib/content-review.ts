// Revisión de una pieza de contenido con IA antes de publicarla. Funciones puras (sin base de datos ni red).

export type ReviewVerdict = "ok" | "issues" | "blocking";

export const REVIEW_MARK = "Revisión IA";
const ICON: Record<ReviewVerdict, string> = { ok: "🟢", issues: "🟡", blocking: "🔴" };
const LABEL: Record<ReviewVerdict, string> = { ok: "sin problemas", issues: "con observaciones", blocking: "con problemas graves" };

export type ReviewPiece = {
  title: string;
  type: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  cta?: string | null;
  brandName: string;
  brandVoice?: string | null;
};

/** Prompt de revisión: tono de la marca, ortografía, CTA coherente y claridad. Pide un formato fácil de leer y de interpretar. */
export function buildReviewPrompt(p: ReviewPiece): { system: string; user: string } {
  const voice = p.brandVoice?.trim();
  return {
    system: [
      "Eres editor de contenido para redes. Revisas una pieza antes de publicarla y respondes en español, breve y concreto.",
      "Formato OBLIGATORIO de la respuesta:",
      "Línea 1: «VEREDICTO: OK», «VEREDICTO: OBSERVACIONES» o «VEREDICTO: GRAVE».",
      "Después, viñetas cortas (máximo 6) con lo que corregir: tono respecto a la voz de la marca, ortografía y gramática, CTA que no coincide con el objetivo, afirmaciones dudosas, claridad.",
      "GRAVE solo si hay errores que no deben publicarse (datos falsos, tono contrario a la marca, faltas serias, CTA roto). Si todo está bien, escribe OK y una frase.",
    ].join("\n"),
    user: [
      `Marca: ${p.brandName}`,
      voice ? `Voz y reglas de la marca:\n${voice.slice(0, 2500)}` : "Voz de la marca: sin definir (no juzgues el tono; revisa solo ortografía, claridad y CTA).",
      `Pieza (${p.type}): ${p.title}`,
      p.hook ? `Gancho: ${p.hook}` : "",
      p.script ? `Guion:\n${p.script.slice(0, 4000)}` : "",
      p.caption ? `Caption:\n${p.caption.slice(0, 2000)}` : "",
      p.cta ? `CTA: ${p.cta}` : "",
    ].filter(Boolean).join("\n\n"),
  };
}

/** Lee el veredicto de la respuesta; si el modelo no siguió el formato, queda en «observaciones» (nunca bloquea por error). */
export function parseReview(text: string): { verdict: ReviewVerdict; body: string } {
  const first = /^\s*veredicto\s*:\s*([a-záéíóú]+)/i.exec(text);
  const word = (first?.[1] ?? "").toLowerCase();
  const verdict: ReviewVerdict = word.startsWith("ok") ? "ok" : word.startsWith("grave") ? "blocking" : "issues";
  const body = text.replace(/^\s*veredicto\s*:[^\n]*\n?/i, "").trim();
  return { verdict, body: body || (verdict === "ok" ? "Todo en orden." : "Sin detalles.") };
}

/** Texto de la nota del equipo. Empieza con una marca fija para poder reconocerla después. */
export function formatReviewNote(verdict: ReviewVerdict, body: string): string {
  return `${ICON[verdict]} ${REVIEW_MARK}: ${LABEL[verdict]}\n${body}`.slice(0, 3000);
}

/** Veredicto de una nota ya guardada, o null si no es una revisión. */
export function verdictOfNote(note: string | null | undefined): ReviewVerdict | null {
  const text = (note ?? "").trimStart();
  if (!text.includes(REVIEW_MARK)) return null;
  if (text.startsWith(ICON.blocking)) return "blocking";
  if (text.startsWith(ICON.issues)) return "issues";
  if (text.startsWith(ICON.ok)) return "ok";
  return null;
}

/** ¿Debe frenar el paso a «aprobado»? Solo si la opción está activa y la última nota del equipo es una revisión grave. */
export function approvalBlocked(latestNote: string | null | undefined, enabled: boolean, override = false): boolean {
  return enabled && !override && verdictOfNote(latestNote) === "blocking";
}
