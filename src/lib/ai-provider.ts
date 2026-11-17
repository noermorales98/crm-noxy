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
