// Cambio automático de modelo cuando uno deja de funcionar. Funciones puras, sin base de datos ni red.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { isPersistentStatus } from "./ai-key-pool.ts";

/** Qué hacer ante un estado HTTP del proveedor. */
export type FailureKind = "ok" | "next-key" | "next-model";

/**
 * 2xx → bien. Clave rechazada, sin créditos, sin permiso, límite de ritmo, tiempo agotado o servidor caído → probar la
 * siguiente cuenta (y, si ninguna sirve, el siguiente modelo). 400/404 (petición o modelo mal) → ya no mejora con otra clave:
 * pasar directo al siguiente modelo.
 */
export function classifyStatus(status: number): FailureKind {
  if (status >= 200 && status < 300) return "ok";
  if ([401, 402, 403, 408, 429].includes(status) || status >= 500) return "next-key";
  return "next-model";
}

/**
 * Cadena de modelos a probar: el pedido primero, luego los de respaldo que el usuario fijó, luego los automáticos.
 * Sin repetidos y con un tope para no alargar la espera.
 */
export function buildModelChain(requested: string, options: { fallbacks?: string[]; automatic?: string[]; max?: number } = {}): string[] {
  const out: string[] = [];
  for (const id of [requested, ...(options.fallbacks ?? []), ...(options.automatic ?? [])]) {
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= (options.max ?? 4)) break;
  }
  return out;
}

/**
 * ¿Hay que cambiar el modelo predeterminado? Solo si el pedido falló por algo que no se arregla solo (todas sus cuentas
 * con 401/402/403) y otro modelo sí respondió. Un límite de ritmo o un 500 pasajero no cambia nada.
 */
export function shouldPromote(failedStatuses: number[], usedModelId: string, requestedModelId: string): boolean {
  // 404 = el modelo ya no existe (retirado): tampoco se arregla solo.
  return usedModelId !== requestedModelId && failedStatuses.length > 0 && failedStatuses.every((s) => isPersistentStatus(s) || s === 404);
}

/** Frase corta para decirle a la persona qué pasó con el modelo que pidió. */
export function describeSwitch(requestedName: string, usedName: string, promoted: boolean): string {
  return promoted
    ? `«${requestedName}» dejó de responder (cuenta sin crédito o clave rechazada). Se usó «${usedName}» y quedó como modelo predeterminado.`
    : `«${requestedName}» no respondió ahora; se usó «${usedName}» esta vez.`;
}

/** Preferencias de IA de la organización: modelo predeterminado, si se cambia solo cuando falla y los respaldos que fijó la persona. */
export type AiPrefs = { defaultModelId: string | null; autoSwitch: boolean; fallbackModelIds: string[] };

export const DEFAULT_AI_PREFS: AiPrefs = { defaultModelId: null, autoSwitch: true, fallbackModelIds: [] };

/** Lee lo guardado sin fiarse de su forma: lo que no cuadre vuelve al valor por defecto (cambio automático encendido). */
export function parseAiPrefs(stored: string | null | undefined): AiPrefs {
  try {
    const data = JSON.parse(stored ?? "") as Partial<AiPrefs>;
    return {
      defaultModelId: typeof data.defaultModelId === "string" && data.defaultModelId.trim() ? data.defaultModelId.trim() : null,
      autoSwitch: data.autoSwitch !== false,
      fallbackModelIds: Array.isArray(data.fallbackModelIds) ? data.fallbackModelIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).slice(0, 5) : [],
    };
  } catch {
    return { ...DEFAULT_AI_PREFS };
  }
}
