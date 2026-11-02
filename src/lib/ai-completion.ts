import { AI_MODELS, DEFAULT_MODEL_ID, getModelById, normalizeModelId, type AiModel } from "@/src/lib/ai-models";
import { prisma } from "@/src/lib/db";

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
    provider: "openrouter",
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

async function completeOpenRouter(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 600
): Promise<string> {
  const primaryKey = process.env.OPENROUTER_API_KEY;
  const secondaryKey = process.env.OPENROUTER_API_KEY_SECONDARY;
  const keys = [primaryKey, secondaryKey].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error("OPENROUTER_API_KEY no configurada");

  const body = JSON.stringify({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    max_tokens: maxTokens,
  });

  let lastError = "Error de OpenRouter";
  for (const apiKey of keys) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://noxthy.co",
        "X-Title": "CRM Noxy",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      lastError = `Error de IA: ${res.status} ${err.slice(0, 200)}`;
      if (res.status === 429 && keys.length > 1) continue;
      throw new Error(lastError);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const message = data.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("La IA no generó contenido");
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
  const text = await completeOpenRouter(
    model.id,
    options.systemPrompt,
    options.userPrompt,
    options.maxTokens,
  );

  return text.slice(0, options.maxOutputChars ?? 1500);
}
