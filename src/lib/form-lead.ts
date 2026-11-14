// Formulario → lead. Funciones puras: deciden la fuente del deal y su etapa inicial.

export type LeadSourceKey =
  | "WHATSAPP" | "REFERIDO" | "LINKEDIN" | "VISITA" | "EMAIL_FRIO"
  | "FORMULARIO" | "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "OTRO";

const SOURCE_ALIASES: [RegExp, LeadSourceKey][] = [
  [/refer|recomend|recomiend/, "REFERIDO"],
  [/insta|^ig$/, "INSTAGRAM"],
  [/tiktok|tik tok/, "TIKTOK"],
  [/facebook|^fb$|^meta$/, "FACEBOOK"],
  [/whats|^wa$/, "WHATSAPP"],
  [/linkedin/, "LINKEDIN"],
  [/web|sitio|form/, "FORMULARIO"],
];

/** Texto libre (parámetro oculto, utm_source…) → fuente del lead; null si no se reconoce. */
export function normalizeLeadSource(raw: unknown): LeadSourceKey | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  for (const [pattern, key] of SOURCE_ALIASES) if (pattern.test(text)) return key;
  return "OTRO";
}

export type FormFieldValue = { label: string; value: string };

/**
 * Fuente del deal: 1) parámetro explícito (`__source`/`utm_source`), 2) un campo del
 * formulario tipo «¿Quién te recomendó?» con respuesta → REFERIDO, 3) FORMULARIO (web).
 */
export function resolveLeadSource(input: {
  explicit?: unknown;
  fields: FormFieldValue[];
}): { source: LeadSourceKey; referredByText: string | null } {
  const referralField = input.fields.find(
    (f) => /refer|recomend|recomiend|quien te|quién te/i.test(f.label) && f.value.trim(),
  );
  const referredByText = referralField ? referralField.value.trim() : null;
  const explicit = normalizeLeadSource(input.explicit);
  if (explicit) return { source: explicit, referredByText };
  if (referredByText) return { source: "REFERIDO", referredByText };
  return { source: "FORMULARIO", referredByText: null };
}

export type PipelineWithStages = {
  id: string;
  createdAt: Date;
  stages: { id: string; name: string; order: number; isWon: boolean; isLost: boolean }[];
};

/** Etapa «Lead» del pipeline comercial (el más antiguo): por nombre; si no, la primera abierta. */
export function pickLeadStage(pipelines: PipelineWithStages[]): { pipelineId: string; stageId: string } | null {
  const sorted = [...pipelines].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const pipeline of sorted) {
    const open = pipeline.stages.filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.order - b.order);
    const byName = open.find((s) => s.name.trim().toLowerCase() === "lead");
    const stage = byName ?? open[0];
    if (stage) return { pipelineId: pipeline.id, stageId: stage.id };
  }
  return null;
}

export function dealTitleForLead(input: { fullName: string; formName: string }): string {
  return `${input.fullName} · ${input.formName}`.slice(0, 190);
}
