// Qué acciones de la IA corren solas y cuáles esperan a que la persona confirme.
// Regla (spec ia-contexto-correos-agente, D): lo interno y reversible corre solo; enviar, borrar o mover a «perdida» siempre pide confirmación.

type ActionLike = { type: string; prefill?: Record<string, unknown> };

export const AUTO_RUN_TYPES = ["draft_email", "create_task"] as const;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Enviar, borrar o cambiar un deal a una etapa perdida: nunca sin confirmación. */
export function isSensitiveAction(a: ActionLike): boolean {
  if (/^(send_|delete_)/.test(a.type)) return true;
  if (a.type === "edit_deal") return Boolean(str(a.prefill?.lostReason)) || str(a.prefill?.stageIsLost) === "true";
  return false;
}

/** ¿Puede ejecutarse sola? Solo las internas y reversibles, y solo con lo mínimo para tener sentido. */
export function isAutoRunnable(a: ActionLike): boolean {
  if (isSensitiveAction(a)) return false;
  if (!(AUTO_RUN_TYPES as readonly string[]).includes(a.type)) return false;
  if (a.type === "draft_email") return str(a.prefill?.body).length > 0;
  if (a.type === "create_task") return str(a.prefill?.title).length > 0;
  return false;
}
