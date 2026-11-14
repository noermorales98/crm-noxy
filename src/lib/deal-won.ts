import { prisma } from "@/src/lib/db";
import { buildTaskDrafts, DEFAULT_TEMPLATES, parseTemplateTasks, pickService } from "@/src/lib/project-templates";

export type WonProjectResult =
  | { created: false; reason: "already-exists" | "not-won" | "no-assignee" | "not-found"; projectId?: string }
  | { created: true; projectId: string; service: string; tasks: number };

/** Plantilla del servicio para la organización; si no existe aún, la siembra desde las predeterminadas. */
async function templateFor(organizationId: string, service: string) {
  const found = await prisma.projectTemplate.findUnique({ where: { organizationId_service: { organizationId, service } } });
  if (found) return found.isActive ? found : null;
  const def = DEFAULT_TEMPLATES.find((t) => t.service === service) ?? DEFAULT_TEMPLATES[0];
  return prisma.projectTemplate.upsert({
    where: { organizationId_service: { organizationId, service: def.service } },
    update: {},
    create: { organizationId, service: def.service, description: def.description, tasks: JSON.stringify(def.tasks) },
  });
}

/**
 * Deal en etapa ganada → proyecto + tareas base (plantilla por servicio).
 * Idempotente: si el deal ya tiene proyecto no hace nada, así que pasar de «Anticipo pagado»
 * a «En producción» o «Entregado» no duplica. Nunca lanza: un fallo aquí no debe frenar el cambio de etapa.
 */
export async function ensureProjectForWonDeal(input: {
  dealId: string;
  organizationId: string;
  actorUserId?: string | null;
}): Promise<WonProjectResult> {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, organizationId: input.organizationId },
      include: { stage: true, pipeline: { select: { name: true } }, projects: { select: { id: true }, take: 1 } },
    });
    if (!deal) return { created: false, reason: "not-found" };
    if (!deal.stage.isWon) return { created: false, reason: "not-won" };
    if (deal.projects[0]) return { created: false, reason: "already-exists", projectId: deal.projects[0].id };

    const assigneeId =
      input.actorUserId ??
      (await prisma.organizationMember.findFirst({ where: { organizationId: input.organizationId, role: "OWNER" }, select: { userId: true } }))?.userId;
    if (!assigneeId) return { created: false, reason: "no-assignee" };

    const service = pickService({ title: deal.title, notes: deal.notes, pipelineName: deal.pipeline?.name });
    const template = await templateFor(input.organizationId, service);
    const drafts = template ? buildTaskDrafts(parseTemplateTasks(template.tasks), new Date()) : [];
    const client = deal.contactId
      ? await prisma.client.findFirst({ where: { organizationId: input.organizationId, contactId: deal.contactId }, select: { id: true } })
      : null;

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: deal.title,
          description: `Proyecto creado al ganar el deal · Servicio: ${service}`,
          organizationId: input.organizationId,
          dealId: deal.id,
          contactId: deal.contactId,
          companyId: deal.companyId,
          clientId: client?.id ?? null,
        },
      });
      if (drafts.length) {
        await tx.task.createMany({
          data: drafts.map((d) => ({
            title: d.title,
            description: d.description,
            dueDate: d.dueDate,
            organizationId: input.organizationId,
            assignedToId: assigneeId,
            projectId: created.id,
            dealId: deal.id,
            contactId: deal.contactId,
          })),
        });
      }
      await tx.activityLog.create({
        data: {
          type: "NOTA",
          description: `Deal ganado → proyecto «${created.name}» con ${drafts.length} tareas base (${service}).`,
          dealId: deal.id,
          organizationId: input.organizationId,
          createdById: input.actorUserId ?? null,
        },
      });
      return created;
    });
    return { created: true, projectId: project.id, service, tasks: drafts.length };
  } catch (error) {
    console.error("ensureProjectForWonDeal error:", error);
    return { created: false, reason: "not-found" };
  }
}
