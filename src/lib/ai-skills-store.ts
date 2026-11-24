import { prisma } from "@/src/lib/db";
import { mergeSkills, parseCustomSkills, MAX_SKILLS, type AiSkill } from "@/src/lib/ai-skills";

/**
 * Las habilidades de cada organización se guardan como JSON en la misma tabla de preferencias de IA (fila aparte,
 * como las preferencias): no hace falta una tabla nueva. Si algún día crecen, se migran a una tabla propia.
 */
const SKILLS_ROW = "skills";

type Stored = { custom: unknown; disabledFactory: string[] };

async function read(organizationId: string): Promise<{ custom: AiSkill[]; disabledFactory: string[] }> {
  try {
    const row = await prisma.aiProviderKey.findUnique({ where: { organizationId_provider: { organizationId, provider: SKILLS_ROW } } });
    if (!row) return { custom: [], disabledFactory: [] };
    const data = JSON.parse(row.apiKey) as Partial<Stored>;
    return {
      custom: parseCustomSkills(JSON.stringify(data.custom ?? [])),
      disabledFactory: Array.isArray(data.disabledFactory) ? data.disabledFactory.filter((v): v is string => typeof v === "string") : [],
    };
  } catch {
    return { custom: [], disabledFactory: [] };
  }
}

/** Todas las habilidades de la organización: las de fábrica (con su estado) y las propias. */
export async function listSkills(organizationId: string): Promise<AiSkill[]> {
  const { custom, disabledFactory } = await read(organizationId);
  return mergeSkills(custom, disabledFactory);
}

/** Guarda las habilidades propias y qué habilidades de fábrica están desactivadas. Devuelve la lista final. */
export async function saveSkills(organizationId: string, input: { custom: unknown; disabledFactory: unknown }): Promise<AiSkill[]> {
  const custom = parseCustomSkills(JSON.stringify(input.custom ?? [])).slice(0, MAX_SKILLS);
  const disabledFactory = Array.isArray(input.disabledFactory) ? input.disabledFactory.filter((v): v is string => typeof v === "string" && v.startsWith("factory-")) : [];
  const apiKey = JSON.stringify({ custom, disabledFactory });
  await prisma.aiProviderKey.upsert({
    where: { organizationId_provider: { organizationId, provider: SKILLS_ROW } },
    create: { organizationId, provider: SKILLS_ROW, apiKey },
    update: { apiKey },
  });
  return mergeSkills(custom, disabledFactory);
}
