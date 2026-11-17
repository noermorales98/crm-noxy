import { AI_MODELS, DEFAULT_MODEL_ID, getModelById, normalizeModelId, type AiModel } from "@/src/lib/ai-models";
import { prisma } from "@/src/lib/db";
import { resolveProviderKeys } from "@/src/lib/ai-keys";
import {
  CHAT_ENDPOINTS,
  missingKeyMessage,
  providerHeaders,
  providerModelName,
  providerOfModelId,
  shouldTryNextKey,
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
  return available.find((m) => m.id === id) ?? getModelById(DEFAULT_MODEL_ID);
}

export async function resolveRequestedModelId(
  orgId: string,
  userId: string,
  requested?: string | null,
): Promise<string> {
  const explicit = requested?.trim() ?? "";
  if (explicit && explicit !== "chatbase") return normalizeModelId(explicit);

  const schedule = await prisma.digestSchedule.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { aiModelId: true },
  });
  return normalizeModelId(schedule?.aiModelId);
}

/** Un proveedor colgado no deja la petición abierta: por debajo del límite de 60 s de las rutas. */
const CALL_TIMEOUT_MS = 50_000;

/**
 * Una petición de completado al proveedor del modelo (OpenRouter o NVIDIA, ambos con interfaz compatible con OpenAI).
 * Con varias cuentas (OpenRouter admite dos) se prueba la siguiente si la primera falla por clave, créditos, límite o servidor.
 * Errores con el formato «Error de IA: <estado> …» para que `describeAiError` los explique sin mostrar el texto del proveedor.
 */
async function completeChat(
  provider: ChatProvider,
  keys: string[],
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 600,
): Promise<string> {
  if (keys.length === 0) throw new Error(missingKeyMessage(provider));

  const body = JSON.stringify({
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: maxTokens,
  });

  let lastError = "Error de IA";
  for (let i = 0; i < keys.length; i++) {
    let res: Response;
    try {
      res = await fetch(CHAT_ENDPOINTS[provider], { method: "POST", headers: providerHeaders(provider, keys[i]), body, signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
    } catch {
      lastError = "Error de IA: 503 sin conexión con el proveedor";
      if (i < keys.length - 1) continue;
      throw new Error(lastError);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      lastError = `Error de IA: ${res.status} ${err.slice(0, 200)}`;
      if (shouldTryNextKey(res.status) && i < keys.length - 1) continue;
      throw new Error(lastError);
    }

    const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
    const message = data.choices?.[0]?.message?.content?.trim();
    if (!message) {
      // Los modelos que razonan gastan tokens «pensando»: si se agota el límite, la respuesta llega vacía.
      lastError = data.choices?.[0]?.finish_reason === "length" ? "La IA se quedó sin espacio para responder" : "La IA no generó contenido";
      if (i < keys.length - 1) continue;
      throw new Error(lastError);
    }
    return message;
  }

  throw new Error(lastError);
}

export async function completeWithAi(options: {
  orgId: string;
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  maxOutputChars?: number;
}): Promise<string> {
  const model = await resolveAiModelForOrg(options.orgId, options.modelId);
  const provider = providerOfModelId(model.id);
  const { keys } = await resolveProviderKeys(options.orgId, provider);
  const text = await completeChat(
    provider,
    keys,
    providerModelName(model.id),
    options.systemPrompt,
    options.userPrompt,
    options.maxTokens,
  );

  return text.slice(0, options.maxOutputChars ?? 1500);
}
