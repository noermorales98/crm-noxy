export type ModelProvider = "openrouter";

export interface AiModel {
  id: string;
  name: string;
  provider: ModelProvider;
  group: string;
  description: string;
  tags?: string[];
}

export const AI_MODELS: AiModel[] = [
  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    group: "Google",
    description: "Instrucciones y conversación fluida",
    tags: ["General"],
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B A4B",
    provider: "openrouter",
    group: "Google",
    description: "Arquitectura mixtura de expertos",
    tags: ["General"],
  },

  // ── NVIDIA Nemotron ────────────────────────────────────────────────────────
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Modelo más grande de NVIDIA",
    tags: ["Potente"],
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron Nano Omni 30B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Razonamiento extendido",
    tags: ["Razonamiento"],
  },

  // ── Cohere ────────────────────────────────────────────────────────────────
  {
    id: "cohere/north-mini-code:free",
    name: "North Mini Code",
    provider: "openrouter",
    group: "Cohere",
    description: "Asistente de código compacto",
    tags: ["Código"],
  },
];

export const DEFAULT_MODEL_ID = "google/gemma-4-31b-it:free";

const RETIRED_MODEL_IDS = new Set([
  "chatbase",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "poolside/laguna-m.1:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
]);

export function normalizeModelId(id: string | null | undefined): string {
  const trimmed = id?.trim() ?? "";
  if (!trimmed || RETIRED_MODEL_IDS.has(trimmed)) return DEFAULT_MODEL_ID;
  return trimmed;
}

export function getModelById(id: string): AiModel {
  return (
    AI_MODELS.find((m) => m.id === id) ??
    AI_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ??
    AI_MODELS[0]
  );
}

export function getModelGroups(): { group: string; models: AiModel[] }[] {
  const groups: Record<string, AiModel[]> = {};
  for (const model of AI_MODELS) {
    if (!groups[model.group]) groups[model.group] = [];
    groups[model.group].push(model);
  }
  return Object.entries(groups).map(([group, models]) => ({ group, models }));
}
