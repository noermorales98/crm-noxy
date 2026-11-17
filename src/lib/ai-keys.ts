import { prisma } from "@/src/lib/db";
import { appSecretKey, decryptSecret, encryptSecret } from "@/src/lib/secret-box";
import { providerKeys, type ChatProvider, type KeySource } from "@/src/lib/ai-provider";

/**
 * Claves de los proveedores de IA de una organización. NVIDIA se guarda cifrada en la base (Ajustes › Modelos de IA) y
 * tiene prioridad; si no hay, se usa la variable de entorno del servidor. OpenRouter sigue en variables de entorno.
 * Si la tabla aún no existe (código desplegado antes de la migración) se trata como «sin clave en la base», sin romper la IA.
 */

export async function resolveProviderKeys(organizationId: string, provider: ChatProvider): Promise<{ keys: string[]; source: KeySource }> {
  if (provider === "nvidia") {
    try {
      const row = await prisma.aiProviderKey.findUnique({ where: { organizationId_provider: { organizationId, provider } } });
      const key = row ? decryptSecret(row.apiKey, appSecretKey()) : null;
      if (key) return { keys: [key], source: "db" };
    } catch (error) {
      // Sin el texto del error (podría traer datos de la consulta): solo su tipo y, si lo hay, el código de Prisma (p. ej. P2021 = falta la tabla).
      const code = (error as { code?: string } | null)?.code;
      console.warn("[ai-keys] no se pudo leer la clave guardada:", error instanceof Error ? error.name : "error", code ?? "");
    }
  }
  const keys = providerKeys(provider, process.env);
  return { keys, source: keys.length ? "env" : "none" };
}

/** `unreadable`: hay una clave guardada que ya no se puede descifrar (p. ej. cambió AUTH_SECRET): hay que quitarla o pegar una nueva. */
export type ProviderKeyStatus = { provider: ChatProvider; source: KeySource; unreadable?: boolean };

/** Estado de cada proveedor para la pantalla de Ajustes: de dónde sale la clave en uso. Nunca devuelve la clave. */
export async function describeProviderKeys(organizationId: string): Promise<ProviderKeyStatus[]> {
  const [nvidia, openrouter] = await Promise.all([resolveProviderKeys(organizationId, "nvidia"), resolveProviderKeys(organizationId, "openrouter")]);
  let unreadable = false;
  if (nvidia.source !== "db") {
    try {
      unreadable = (await prisma.aiProviderKey.count({ where: { organizationId, provider: "nvidia" } })) > 0;
    } catch {
      unreadable = false;
    }
  }
  return [
    { provider: "nvidia", source: nvidia.source, unreadable },
    { provider: "openrouter", source: openrouter.source },
  ];
}

export async function saveProviderKey(organizationId: string, provider: ChatProvider, key: string): Promise<void> {
  const apiKey = encryptSecret(key, appSecretKey());
  await prisma.aiProviderKey.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: { organizationId, provider, apiKey },
    update: { apiKey },
  });
}

export async function deleteProviderKey(organizationId: string, provider: ChatProvider): Promise<void> {
  await prisma.aiProviderKey.deleteMany({ where: { organizationId, provider } });
}

/** Comprueba la clave contra NVIDIA sin guardarla. `unreachable` = no se pudo decidir (red o servidor): no es una clave mala. */
export async function checkNvidiaKey(key: string): Promise<"valid" | "invalid" | "unreachable"> {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) return "invalid";
    return res.ok ? "valid" : "unreachable";
  } catch {
    return "unreachable";
  }
}
