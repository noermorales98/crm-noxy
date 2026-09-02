import { prisma } from "@/src/lib/db";
import type { ProjectSubmission } from "@/src/lib/project-submission-types";

export type { ProjectSubmission } from "@/src/lib/project-submission-types";
export { isPlaceholderExtraFields } from "@/src/lib/project-submission-types";

export async function getProjectForms(projectId: string) {
  return prisma.form.findMany({
    where: { projectId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectSubmissions(opts: {
  projectId: string;
  organizationId: string;
  formId?: string | null;
}): Promise<{ forms: { id: string; name: string }[]; submissions: ProjectSubmission[] }> {
  const forms = await getProjectForms(opts.projectId);
  const formIds = forms.map((f) => f.id);
  const filterIds =
    opts.formId && formIds.includes(opts.formId) ? [opts.formId] : formIds;

  if (filterIds.length === 0) {
    return { forms, submissions: [] };
  }

  const contacts = await prisma.contact.findMany({
    where: {
      sourceFormId: { in: filterIds },
      organizationId: opts.organizationId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      sourceVariant: { select: { id: true, name: true } },
      sourceForm: { select: { id: true, name: true } },
      tasks: {
        take: 1,
        orderBy: { createdAt: "desc" },
        where: { formId: { in: filterIds } },
      },
    },
  });

  return {
    forms,
    submissions: contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      sourceForm: c.sourceForm,
      sourceVariant: c.sourceVariant,
      extraFields: c.tasks?.[0]?.description ?? null,
    })),
  };
}

export async function countProjectSubmissions(projectId: string, organizationId: string) {
  const forms = await getProjectForms(projectId);
  const formIds = forms.map((f) => f.id);
  if (formIds.length === 0) return 0;
  return prisma.contact.count({
    where: { sourceFormId: { in: formIds }, organizationId },
  });
}
