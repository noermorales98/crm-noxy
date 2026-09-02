import { prisma } from "@/src/lib/db";
import { getProjectSubmissions } from "@/src/lib/project-submissions";

export async function getPublicProjectByToken(token: string) {
  if (!token) return null;
  return prisma.project.findFirst({
    where: { publicToken: token, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      organizationId: true,
      publicToken: true,
    },
  });
}

export async function getPublicProjectMeta(token: string) {
  const project = await getPublicProjectByToken(token);
  if (!project) return null;

  const [pendingTasks, docsCount, forms] = await Promise.all([
    prisma.task.count({ where: { projectId: project.id, isCompleted: false } }),
    prisma.kbPageRelation.count({ where: { entityType: "PROJECT", entityId: project.id } }),
    prisma.form.findMany({ where: { projectId: project.id }, select: { id: true } }),
  ]);

  const formIds = forms.map((f) => f.id);
  const submissionsCount =
    formIds.length === 0
      ? 0
      : await prisma.contact.count({
          where: { organizationId: project.organizationId, sourceFormId: { in: formIds } },
        });

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    counts: {
      pendingTasks,
      docs: docsCount,
      submissions: submissionsCount,
    },
  };
}

export async function getPublicProjectTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      isCompleted: true,
      createdAt: true,
      dueDate: true,
    },
  });
}

export async function getProjectLinkedDocs(projectId: string) {
  return prisma.kbPageRelation.findMany({
    where: { entityType: "PROJECT", entityId: projectId },
    include: {
      page: {
        select: {
          id: true,
          title: true,
          emoji: true,
          iconColor: true,
          iconBg: true,
          isFolder: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isPageInProjectDocs(opts: {
  projectId: string;
  organizationId: string;
  pageId: string;
}): Promise<boolean> {
  const linked = await prisma.kbPageRelation.findMany({
    where: { entityType: "PROJECT", entityId: opts.projectId },
    include: { page: { select: { id: true, isFolder: true } } },
  });
  const linkedIds = new Set(linked.map((r) => r.page.id));
  const folderIds = new Set(linked.filter((r) => r.page.isFolder).map((r) => r.page.id));

  if (linkedIds.has(opts.pageId)) return true;

  let currentId: string | null = opts.pageId;
  while (currentId) {
    const row: { parentId: string | null } | null = await prisma.kbPage.findFirst({
      where: { id: currentId, organizationId: opts.organizationId },
      select: { parentId: true },
    });
    if (!row) return false;
    currentId = row.parentId;
    if (currentId && folderIds.has(currentId)) return true;
  }

  return false;
}

export async function getPublicProjectPage(opts: {
  projectId: string;
  organizationId: string;
  pageId: string;
}) {
  const allowed = await isPageInProjectDocs(opts);
  if (!allowed) return null;

  const page = await prisma.kbPage.findFirst({
    where: { id: opts.pageId, organizationId: opts.organizationId },
    select: {
      id: true,
      title: true,
      content: true,
      isFolder: true,
      markdownTheme: true,
      emoji: true,
      iconColor: true,
      iconBg: true,
      updatedAt: true,
      children: {
        select: {
          id: true,
          title: true,
          emoji: true,
          iconColor: true,
          iconBg: true,
          isFolder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
    },
  });

  return page;
}

export async function getPublicProjectSubmissions(opts: {
  projectId: string;
  organizationId: string;
  formId?: string | null;
}) {
  return getProjectSubmissions(opts);
}
