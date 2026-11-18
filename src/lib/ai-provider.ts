/**
 * Proveedores de IA con interfaz compatible con OpenAI. Funciones puras (sin base de datos ni red) para poder probarlas.
 * Un modelo de NVIDIA se reconoce por el prefijo `nvidia:` en su id (p. ej. `nvidia:deepseek-ai/deepseek-v4.1-flash`);
 * cualquier otro id es de OpenRouter. Así los modelos personalizados de Ajustes pueden ser de cualquiera de los dos.
 */

export type ChatProvider = "openrouter" | "nvidia";

export const NVIDIA_PREFIX = "nvidia:";

export const providerOfModelId = (id: string): ChatProvider => (id.startsWith(NVIDIA_PREFIX) ? "nvidia" : "openrouter");

/** Nombre del modelo tal como lo espera el proveedor (sin el prefijo propio del CRM). */
export const providerModelName = (id: string): string => (id.startsWith(NVIDIA_PREFIX) ? id.slice(NVIDIA_PREFIX.length) : id);

export const CHAT_ENDPOINTS: Record<ChatProvider, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
};

export const PROVIDER_LABEL: Record<ChatProvider, string> = { openrouter: "OpenRouter", nvidia: "NVIDIA" };

/** Claves configuradas para el proveedor, en orden de uso. OpenRouter admite dos cuentas; NVIDIA una. */
export function providerKeys(provider: ChatProvider, env: Record<string, string | undefined>): string[] {
  const list = provider === "nvidia" ? [env.NVIDIA_API_KEY] : [env.OPENROUTER_API_KEY, env.OPENROUTER_API_KEY_SECONDARY];
  return list.map((key) => key?.trim()).filter((key): key is string => Boolean(key));
}

export const missingKeyMessage = (provider: ChatProvider): string =>
  provider === "nvidia" ? "NVIDIA_API_KEY no configurada" : "OPENROUTER_API_KEY no configurada";

/** Cabeceras de la petición. La clave solo viaja aquí, nunca en la URL ni en el cuerpo. */
export function providerHeaders(provider: ChatProvider, apiKey: string): Record<string, string> {
  const base = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  return provider === "openrouter" ? { ...base, "HTTP-Referer": "https://noxthy.co", "X-Title": "CRM Noxy" } : base;
}

/**
 * ¿Vale la pena probar con la otra cuenta del mismo proveedor? Sí ante clave rechazada, sin créditos, límite de ritmo,
 * tiempo agotado o fallo del servidor: la otra cuenta puede tener cupo. Un 400 o un 404 (petición o modelo mal) no mejora.
 */
export const shouldTryNextKey = (status: number): boolean => [401, 402, 403, 408, 429].includes(status) || status >= 500;

/** Una clave de NVIDIA empieza por `nvapi-`. Se valida la forma antes de molestar al proveedor. */
export function parseProviderApiKey(provider: ChatProvider, input: unknown): { ok: true; key: string } | { ok: false; error: string } {
  const key = typeof input === "string" ? input.trim() : "";
  if (!key) return { ok: false, error: "Pega la clave." };
  if (provider === "nvidia" && !/^nvapi-[A-Za-z0-9_-]{16,}$/.test(key)) {
    return { ok: false, error: "Una clave de NVIDIA empieza por nvapi- y no lleva espacios." };
  }
  if (key.length > 512) return { ok: false, error: "La clave es demasiado larga." };
  return { ok: true, key };
}

/** De dónde sale la clave en uso: la guardada en la base (tiene prioridad), la variable de entorno del servidor, o ninguna. */
export type KeySource = "db" | "env" | "none";

/** ¿Es un modelo de chat? La lista de NVIDIA incluye también modelos de embeddings, reordenado, seguridad, visión, etc. */
export const isNvidiaChatModelId = (id: string): boolean =>
  /\//.test(id) && !/(embed|rerank|guard|clip|parse|safety|reward|retriev|nvclip|-vl\b|vision|ocr|asr|tts|riva|pii|detector|calibration|cosmos|synthetic|video|image|diffusion|audio|speech|molmim|genmol|diffdock)/i.test(id);

type ListedModel = { id: string; name: string; group: string; provider: string; configured: boolean };

/**
 * Lista vigente de modelos de NVIDIA (ids tal como los devuelve su API, sin prefijo) mezclada con el catálogo del CRM:
 * los de NVIDIA del catálogo que ya no existan se quitan, y los vigentes que el catálogo no tenga se añaden al final.
 * Los modelos de otros proveedores no se tocan.
 */
export function mergeNvidiaModels(catalog: ListedModel[], liveIds: string[]): ListedModel[] {
  const live = new Set(liveIds.filter(isNvidiaChatModelId));
  const kept = catalog.filter((m) => m.provider !== "nvidia" || live.has(providerModelName(m.id)));
  const have = new Set(kept.map((m) => m.id));
  const extra = [...live]
    .map((id) => `${NVIDIA_PREFIX}${id}`)
    .filter((id) => !have.has(id))
    .sort()
    .map((id) => ({ id, name: providerModelName(id).split("/").pop() ?? id, group: "NVIDIA (disponibles ahora)", provider: "nvidia", configured: true }));
  return [...kept, ...extra];
}

/**
 * Modelos LIGEROS de NVIDIA para el respaldo cuando el modelo elegido falla: rápidos y de pocos parámetros activos
 * (probados con una llamada real: responden en menos de 1 s). Nunca se usan los pesados. En orden de preferencia.
 */
export const LIGHT_NVIDIA_MODELS = ["nvidia:nvidia/nemotron-3.5-lightning-30b-a3b", "nvidia:nvidia/nemotron-3.5-bolt-e4b"] as const;

/**
 * Modelos de respaldo a probar tras `primaryId`: los ligeros de NVIDIA, sin repetir el principal y, si se conoce la lista
 * vigente de NVIDIA, solo los que existan hoy (un modelo retirado no se intenta).
 */
export function fallbackCandidates(primaryId: string, liveIds: string[] | null): string[] {
  const live = liveIds ? new Set(liveIds) : null;
  return LIGHT_NVIDIA_MODELS.filter((id) => id !== primaryId && (!live || live.has(providerModelName(id))));
}
