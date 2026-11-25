// Modelo de IA con el que se generan las sugerencias de una cita. Lo elige la barra de la cita («Sugerir con IA») y lo
// recuerda el navegador; vacío = el predeterminado de la organización (Ajustes › Modelos de IA). Solo corre en el navegador.

/** `tags` viene de la API: el nivel (Potente, Equilibrado o Ligero) y, si aplica, Razonamiento, Código o Visión. */
export type SuggestionModelOption = { id: string; name: string; group: string; provider: string; configured: boolean; tier?: string; tags?: string[] };

/** Valor que viaja por el bus de acciones cuando se pide generar con el modelo predeterminado. */
export const DEFAULT_MODEL_TARGET = "default";

const KEY = "noxy.suggestions.model";

export function readSuggestionModel(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeSuggestionModel(id: string): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // sin almacenamiento: el modelo elegido solo dura esta visita
  }
}

/** El destino de la acción «generar» → id de modelo ("" = predeterminado). Sin destino se usa el último elegido. */
export function modelFromTarget(target: string | undefined): string {
  if (target === undefined) return readSuggestionModel();
  return target === DEFAULT_MODEL_TARGET ? "" : target;
}
