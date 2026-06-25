export type ModelProvider = "chatbase" | "openrouter";

export interface AiModel {
  id: string;
  name: string;
  provider: ModelProvider;
  group: string;
  description: string;
  tags?: string[];
}

export const AI_MODELS: AiModel[] = [
  // ── Chatbase (default) ────────────────────────────────────────────────────
  {
    id: "chatbase",
    name: "Chatbase",
    provider: "chatbase",
    group: "Predeterminado",
    description: "Bot personalizado con acceso al CRM",
    tags: ["CRM", "Personalizado"],
  },

  // ── Meta / Llama ──────────────────────────────────────────────────────────
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "openrouter",
    group: "Meta",
    description: "Excelente para uso general",
    tags: ["General"],
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B",
    provider: "openrouter",
    group: "Meta",
    description: "Ultrarrápido y ligero",
    tags: ["Rápido"],
  },

  // ── OpenAI OSS ────────────────────────────────────────────────────────────
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B",
    provider: "openrouter",
    group: "OpenAI OSS",
    description: "Gran capacidad de razonamiento",
    tags: ["Potente"],
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    provider: "openrouter",
    group: "OpenAI OSS",
    description: "Equilibrado y eficiente",
    tags: ["Rápido"],
  },

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

  // ── Qwen ─────────────────────────────────────────────────────────────────
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    provider: "openrouter",
    group: "Qwen",
    description: "Especializado en código (480B MoE)",
    tags: ["Código"],
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "Qwen3 80B",
    provider: "openrouter",
    group: "Qwen",
    description: "Instrucciones y análisis avanzado",
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
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super 120B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Razonamiento de alta capacidad",
    tags: ["Potente"],
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron Nano 30B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Equilibrado y eficiente",
    tags: ["General"],
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron Nano Omni 30B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Razonamiento extendido",
    tags: ["Razonamiento"],
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Rápido y compacto",
    tags: ["Rápido"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    provider: "openrouter",
    group: "NVIDIA",
    description: "Visión y lenguaje",
    tags: ["Visión"],
  },

  // ── Nous Research ─────────────────────────────────────────────────────────
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    provider: "openrouter",
    group: "Nous Research",
    description: "Razonamiento y seguimiento de instrucciones",
    tags: ["Potente"],
  },

  // ── LiquidAI ──────────────────────────────────────────────────────────────
  {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    name: "LFM2.5 1.2B",
    provider: "openrouter",
    group: "LiquidAI",
    description: "Ultra rápido, ideal para respuestas simples",
    tags: ["Rápido"],
  },
  {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    name: "LFM2.5 1.2B Thinking",
    provider: "openrouter",
    group: "LiquidAI",
    description: "Razonamiento paso a paso",
    tags: ["Razonamiento"],
  },

  // ── Poolside ──────────────────────────────────────────────────────────────
  {
    id: "poolside/laguna-m.1:free",
    name: "Laguna M.1",
    provider: "openrouter",
    group: "Poolside",
    description: "Optimizado para código y análisis",
    tags: ["Código"],
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

  // ── Cognitivecomputations ─────────────────────────────────────────────────
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Dolphin 24B",
    provider: "openrouter",
    group: "Venice",
    description: "Sin censura, respuestas directas",
    tags: ["Sin filtros"],
  },
];

export const DEFAULT_MODEL_ID = "chatbase";

export function getModelById(id: string): AiModel {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0];
}

export function getModelGroups(): { group: string; models: AiModel[] }[] {
  const groups: Record<string, AiModel[]> = {};
  for (const model of AI_MODELS) {
    if (!groups[model.group]) groups[model.group] = [];
    groups[model.group].push(model);
  }
  return Object.entries(groups).map(([group, models]) => ({ group, models }));
}
