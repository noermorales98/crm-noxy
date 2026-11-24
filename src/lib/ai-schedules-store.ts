import { prisma } from "@/src/lib/db";
import { parseSchedules, MAX_SCHEDULES_PER_USER, type AiSchedule } from "@/src/lib/ai-schedules";

/** Como las habilidades: JSON de la organización en la tabla de preferencias de IA (fila `schedules`), sin tabla nueva. */
const ROW = "schedules";

export async function listSchedules(organizationId: string): Promise<AiSchedule[]> {
  try {
    const row = await prisma.aiProviderKey.findUnique({ where: { organizationId_provider: { organizationId, provider: ROW } } });
    return row ? parseSchedules(row.apiKey) : [];
  } catch {
    return [];
  }
}

export async function saveSchedules(organizationId: string, schedules: AiSchedule[]): Promise<void> {
  const apiKey = JSON.stringify(schedules);
  await prisma.aiProviderKey.upsert({
    where: { organizationId_provider: { organizationId, provider: ROW } },
    create: { organizationId, provider: ROW, apiKey },
    update: { apiKey },
  });
}

/** Todas las programaciones de todas las organizaciones (para el cron). */
export async function listAllScheduleRows(): Promise<{ organizationId: string; schedules: AiSchedule[] }[]> {
  const rows = await prisma.aiProviderKey.findMany({ where: { provider: ROW }, select: { organizationId: true, apiKey: true } });
  return rows.map((r) => ({ organizationId: r.organizationId, schedules: parseSchedules(r.apiKey) }));
}

export { MAX_SCHEDULES_PER_USER };
