// Qué tan potente o ligero es un modelo y para qué sirve, a partir de su nombre. Puro: sin red ni base de datos.
// Los modelos del catálogo traen su propia descripción; los que llegan de la lista en vivo de NVIDIA o los personalizados no, así que
// se deducen del nombre (tamaño en miles de millones de parámetros, «lightning», «coder», «reasoning»…).

export type ModelTier = "powerful" | "balanced" | "light";

export type ModelInfo = { tier: ModelTier; tags: string[]; description: string };

/** Tamaño en miles de millones de parámetros que anuncia el nombre: «70b» → 70, «1t» → 1000, «a3b» (activos) se ignora. */
export function modelSizeB(name: string): number | null {
  const n = name.toLowerCase();
  const sizes: number[] = [];
  for (const m of n.matchAll(/(?<![a-z\d.])(\d+(?:\.\d+)?)\s?(t|b)(?![a-z])/g)) {
    // «a3b» / «a52b» son los parámetros activos de un modelo MoE, no su tamaño: el lookbehind ya los deja fuera.
    sizes.push(Number(m[1]) * (m[2] === "t" ? 1000 : 1));
  }
  return sizes.length ? Math.max(...sizes) : null;
}

// Palabras que el fabricante usa para decir «rápido y pequeño»: valen aunque el modelo sea grande por dentro (un MoE de 30B con 3B activos es ligero).
const LIGHT_WORDS = /(lightning|bolt|flash|mini|nano|tiny|lite|haiku|\bsmall\b|-e\d+b)/i;
const POWERFUL = /(large|ultra|opus|pro\b|-1t|405b|120b|235b|253b|340b|\bmax\b|gpt-oss-120b|maverick|sonnet)/i;

const TIER_TEXT: Record<ModelTier, { label: string; description: string }> = {
  powerful: { label: "Potente", description: "Más capaz y más lento: para redactar, razonar y tareas largas." },
  balanced: { label: "Equilibrado", description: "Buena calidad con velocidad razonable: sirve para casi todo." },
  light: { label: "Ligero", description: "Responde muy rápido y gasta poco: ideal para resúmenes, respaldos y tareas cortas." },
};

export const tierLabel = (tier: ModelTier): string => TIER_TEXT[tier].label;

/** Clasifica un modelo por su nombre. Un tamaño explícito manda; si no lo hay, las palabras del nombre. */
export function classifyModel(id: string, name: string = id): ModelInfo {
  const text = `${id} ${name}`.replace(/^nvidia:/, "");
  const size = modelSizeB(text);
  const tags: string[] = [];
  if (/(coder|code\b|codestral|devstral)/i.test(text)) tags.push("Código");
  if (/(reason|\br1\b|think|o1\b|o3\b|qwq|deepseek-r)/i.test(text)) tags.push("Razonamiento");
  if (/(vision|-vl\b|\bvl-|llava|pixtral)/i.test(text)) tags.push("Visión");
  if (/(uncensored|abliterated)/i.test(text)) tags.push("Sin filtros");

  let tier: ModelTier;
  if (LIGHT_WORDS.test(text)) tier = "light";
  else if (POWERFUL.test(text) || (size !== null && size >= 70)) tier = "powerful";
  else if (size !== null && size <= 9) tier = "light";
  else tier = "balanced";

  return { tier, tags: [TIER_TEXT[tier].label, ...tags], description: describeModel(tier, tags, size) };
}

function describeModel(tier: ModelTier, tags: string[], size: number | null): string {
  const base = TIER_TEXT[tier].description;
  const extras: string[] = [];
  if (tags.includes("Código")) extras.push("Especializado en código.");
  if (tags.includes("Razonamiento")) extras.push("Piensa paso a paso antes de responder (puede tardar más).");
  if (tags.includes("Visión")) extras.push("Entiende imágenes.");
  if (tags.includes("Sin filtros")) extras.push("Sin filtros de contenido.");
  const sizeText = size ? ` ${size >= 1000 ? `${size / 1000} T` : `${size} B`} de parámetros.` : "";
  return [base + sizeText, ...extras].join(" ").trim();
}

/** Orden de los niveles para listas: potentes primero, luego equilibrados y ligeros. */
export const TIER_ORDER: Record<ModelTier, number> = { powerful: 0, balanced: 1, light: 2 };
