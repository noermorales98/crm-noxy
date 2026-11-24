import { AI_MODELS, DEFAULT_MODEL_ID, getModelById, normalizeModelId, type AiModel } from "@/src/lib/ai-models";
import { prisma } from "@/src/lib/db";
import { getAiPrefs, listNvidiaModelIds, recordKeyResult, resolveProviderEntries, saveAiPrefs, type ProviderEntry } from "@/src/lib/ai-keys";
import { buildModelChain, classifyStatus, describeSwitch, shouldPromote } from "@/src/lib/ai-failover";
import {
  CHAT_ENDPOINTS,
  LIGHT_NVIDIA_MODELS,
  missingKeyMessage,
  providerHeaders,
  providerModelName,
  providerOfModelId,
  type ChatProvider,
} from "@/src/lib/ai-provider";

export async function getAvailableAiModels(orgId: string): Promise<AiModel[]> {
  const [customs, org] = await Promise.all([
    prisma.customAiModel.findMany({
      where: { organizationId: orgId, enabled: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { hiddenAiModels: true },
    }),
  ]);

  let hidden: string[] = [];
  try {
    hidden = JSON.parse(org?.hiddenAiModels || "[]");
  } catch {
    hidden = [];
  }

  const builtins = AI_MODELS.filter((m) => !hidden.includes(m.id));
  const customModels: AiModel[] = customs.map((m) => ({
    id: m.modelId,
    name: m.name,
    provider: providerOfModelId(m.modelId),
    group: m.group || "Personalizados",
    description: m.description || "",
    tags: JSON.parse(m.tags || "[]"),
  }));

  return [...builtins, ...customModels];
}

export async function resolveAiModelForOrg(orgId: string, modelId: string): Promise<AiModel> {
  const id = normalizeModelId(modelId);
  const available = await getAvailableAiModels(orgId);
  const found = available.find((m) => m.id === id);
  if (found) return found;
  // Un modelo de NVIDIA vigente que no está en el catálogo (viene de la lista en vivo) se respeta tal cual.
  if (providerOfModelId(id) === "nvidia") return { id, name: providerModelName(id), provider: "nvidia", group: "NVIDIA", description: "" };
  return getModelById(DEFAULT_MODEL_ID);
}

export async function resolveRequestedModelId(
  orgId: string,
  userId: string,
  requested?: string | null,
): Promise<string> {
  const explicit = requested?.trim() ?? "";
  if (explicit && explicit !== "chatbase") return normalizeModelId(explicit);

  // El predeterminado de la organización (Ajustes › Modelos de IA) manda; después el modelo guardado en el resumen diario.
  const [prefs, schedule] = await Promise.all([
    getAiPrefs(orgId),
    prisma.digestSchedule.findUnique({ where: { userId_organizationId: { userId, organizationId: orgId } }, select: { aiModelId: true } }),
  ]);
  return normalizeModelId(prefs.defaultModelId ?? schedule?.aiModelId);
}

/** Un proveedor colgado no deja la petición abierta: por debajo del límite de 60 s de las rutas. */
const SINGLE_CALL_TIMEOUT_MS = 50_000;
/** Con varios modelos por probar, cada llamada espera menos para que quepa el cambio dentro del mismo límite. */
const CHAIN_CALL_TIMEOUT_MS = 22_000;

type CallResult = { ok: true; text: string } | { ok: false; status: number; message: string };

/**
 * Una petición de completado a UNA cuenta de un proveedor (OpenRouter o NVIDIA, ambos con interfaz compatible con OpenAI).
 * Errores con el formato «Error de IA: <estado> …» para que `describeAiError` los explique sin mostrar el texto del proveedor.
 * Estado 0 = el proveedor respondió pero sin contenido.
 */
async function callChat(provider: ChatProvider, key: string, modelName: string, systemPrompt: string, userPrompt: string, maxTokens: number, timeoutMs: number): Promise<CallResult> {
  const body = JSON.stringify({
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: maxTokens,
  });
  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINTS[provider], { method: "POST", headers: providerHeaders(provider, key), body, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return { ok: false, status: 503, message: "Error de IA: 503 sin conexión con el proveedor" };
  }
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: `Error de IA: ${res.status} ${err.slice(0, 200)}` };
  }
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    // Los modelos que razonan gastan tokens «pensando»: si se agota el límite, la respuesta llega vacía.
    return { ok: false, status: 0, message: data.choices?.[0]?.finish_reason === "length" ? "La IA se quedó sin espacio para responder" : "La IA no generó contenido" };
  }
  return { ok: true, text };
}

/** Modelos a probar solos cuando el pedido falla: los ligeros de NVIDIA (si hay cuenta) y el gratuito de OpenRouter (si hay cuenta). */
export async function automaticCandidates(orgId: string, requestedId: string): Promise<string[]> {
  const [nvidia, openrouter] = await Promise.all([resolveProviderEntries(orgId, "nvidia"), resolveProviderEntries(orgId, "openrouter")]);
  const out: string[] = [];
  if (nvidia.length) {
    const live = await listNvidiaModelIds(orgId);
    for (const id of LIGHT_NVIDIA_MODELS) if (!live || live.includes(providerModelName(id))) out.push(id);
  }
  if (openrouter.length) out.push(DEFAULT_MODEL_ID);
  return out.filter((id) => id !== requestedId);
}

/** Deja `newModelId` como predeterminado (y en los resúmenes que usaban el que falló). Nunca rompe la respuesta. */
export async function promoteDefaultModel(orgId: string, failedModelId: string, newModelId: string): Promise<void> {
  try {
    await saveAiPrefs(orgId, { defaultModelId: newModelId });
    await prisma.digestSchedule.updateMany({ where: { organizationId: orgId, aiModelId: failedModelId }, data: { aiModelId: newModelId } });
  } catch (error) {
    console.warn("[ai] no se pudo guardar el nuevo modelo predeterminado:", error instanceof Error ? error.name : "error");
  }
}

export type AiCompletion = { text: string; modelId: string; requestedModelId: string; switched: boolean; promoted: boolean; note: string | null };

/**
 * Completado con cambio automático: prueba las cuentas del proveedor del modelo pedido (si una falla por clave, créditos o
 * límite, la siguiente) y, si ninguna sirve, otro modelo (los respaldos fijados y luego los automáticos). Si el modelo pedido
 * dejó de funcionar de forma permanente (cuenta sin créditos, clave rechazada, modelo retirado), el que respondió queda como
 * modelo predeterminado. Con el cambio automático apagado solo se usa el modelo pedido.
 */
export async function completeWithAiDetailed(options: {
  orgId: string;
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  maxOutputChars?: number;
}): Promise<AiCompletion> {
  const requested = await resolveAiModelForOrg(options.orgId, options.modelId);
  const prefs = await getAiPrefs(options.orgId);
  const chain = prefs.autoSwitch
    ? buildModelChain(requested.id, { fallbacks: prefs.fallbackModelIds, automatic: await automaticCandidates(options.orgId, requested.id) })
    : [requested.id];
  const timeoutMs = chain.length > 1 ? CHAIN_CALL_TIMEOUT_MS : SINGLE_CALL_TIMEOUT_MS;
  const maxTokens = options.maxTokens ?? 600;

  let lastMessage = "Error de IA";
  let primaryStatuses: number[] = [];
  for (let index = 0; index < chain.length; index++) {
    const model = index === 0 ? requested : await resolveAiModelForOrg(options.orgId, chain[index]);
    const provider = providerOfModelId(model.id);
    const entries: ProviderEntry[] = await resolveProviderEntries(options.orgId, provider);
    if (entries.length === 0) {
      lastMessage = missingKeyMessage(provider);
      continue;
    }
    const statuses: number[] = [];
    for (const entry of entries) {
      const result = await callChat(provider, entry.key, providerModelName(model.id), options.systemPrompt, options.userPrompt, maxTokens, timeoutMs);
      void recordKeyResult(options.orgId, provider, entry.id, result.ok ? 200 : result.status || 502);
      if (result.ok) {
        const switched = index > 0;
        const promoted = switched && shouldPromote(primaryStatuses, model.id, requested.id);
        if (promoted) await promoteDefaultModel(options.orgId, requested.id, model.id);
        if (switched) console.warn(`[ai] ${requested.id} no respondió; se usó ${model.id}${promoted ? " y quedó como predeterminado" : ""}`);
        return {
          text: result.text.slice(0, options.maxOutputChars ?? 1500),
          modelId: model.id,
          requestedModelId: requested.id,
          switched,
          promoted,
          note: switched ? describeSwitch(requested.name, model.name, promoted) : null,
        };
      }
      lastMessage = result.message;
      statuses.push(result.status);
      if (classifyStatus(result.status) === "next-model") break;
    }
    if (index === 0) primaryStatuses = statuses;
  }
  throw new Error(lastMessage);
}

/** Igual que `completeWithAiDetailed`, pero devuelve solo el texto (lo que usan casi todas las pantallas). */
export async function completeWithAi(options: {
  orgId: string;
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  maxOutputChars?: number;
}): Promise<string> {
  return (await completeWithAiDetailed(options)).text;
}
