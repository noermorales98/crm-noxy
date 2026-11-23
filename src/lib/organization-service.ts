import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { ALL_PERMISSIONS } from "@/src/lib/permissions";
import { DEFAULT_PIPELINES, type OrganizationInput } from "@/src/lib/organizations";
import { DEFAULT_TEMPLATES } from "@/src/lib/project-templates";

/** Organizaciones de un usuario con su rol, de la más antigua a la más reciente. */
export async function listMemberships(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, timezone: true, brandColor: true, brandIcon: true, themeId: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** Sub-cuenta nueva, todo en una transacción: organización, OWNER, pipelines con etapas y plantillas de proyecto. */
export async function createSubAccount(userId: string, input: OrganizationInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const organization = await tx.organization.create({ data: { name: input.name, timezone: input.timezone } });
    const member = await tx.organizationMember.create({
      data: { userId, organizationId: organization.id, role: "OWNER", permissions: ALL_PERMISSIONS as Prisma.InputJsonValue },
    });
    for (const pipeline of DEFAULT_PIPELINES) {
      await tx.pipeline.create({
        data: {
          name: pipeline.name,
          organizationId: organization.id,
          stages: {
            create: pipeline.stages.map((s, i) => ({ name: s.name, order: i + 1, isWon: !!s.isWon, isLost: !!s.isLost, color: s.color })),
          },
        },
      });
    }
    await tx.projectTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({ organizationId: organization.id, service: t.service, description: t.description, tasks: JSON.stringify(t.tasks) })),
    });
    return { organization, member };
  });
}
