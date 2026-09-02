import { prisma } from "@/src/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkSquare01Icon, FolderIcon, UserMultipleIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";
import { getPublicProjectByToken } from "@/src/lib/project-public";

export default async function PublicProjectOverviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getPublicProjectByToken(token);
  if (!project) notFound();

  const formIds = (
    await prisma.form.findMany({ where: { projectId: project.id }, select: { id: true } })
  ).map((f) => f.id);

  const [pendingTasksCount, recentTasks, docsRelations, submissionsCount, recentSubmissions] = await Promise.all([
    prisma.task.count({ where: { projectId: project.id, isCompleted: false } }),
    prisma.task.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, isCompleted: true },
    }),
    prisma.kbPageRelation.findMany({
      where: { entityType: "PROJECT", entityId: project.id },
      include: { page: { select: { id: true, title: true, emoji: true, isFolder: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    formIds.length === 0
      ? Promise.resolve(0)
      : prisma.contact.count({
          where: { organizationId: project.organizationId, sourceFormId: { in: formIds } },
        }),
    formIds.length === 0
      ? Promise.resolve([] as { id: string; firstName: string; lastName: string | null; createdAt: Date; sourceForm: { name: string } | null }[])
      : prisma.contact.findMany({
          where: { organizationId: project.organizationId, sourceFormId: { in: formIds } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            sourceForm: { select: { name: true } },
          },
        }),
  ]);

  const docsCount = await prisma.kbPageRelation.count({
    where: { entityType: "PROJECT", entityId: project.id },
  });

  const stats = [
    { label: "Tareas pendientes", value: pendingTasksCount, icon: CheckmarkSquare01Icon, color: "#ef4444", href: `/proyecto/${token}/tareas` },
    { label: "Docs vinculados", value: docsCount, icon: FolderIcon, color: "#0891b2", href: `/proyecto/${token}/docs` },
    { label: "Registrados", value: submissionsCount, icon: UserMultipleIcon, color: "#22c55e", href: `/proyecto/${token}/registros` },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
      {project.description && (
        <p className="text-sm text-text-secondary">{project.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white border border-border-subtle rounded-lg p-4 hover:bg-nav-hover transition-colors">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}1A` }}>
              <HugeiconsIcon icon={s.icon} size={16} color={s.color} />
            </div>
            <p className="text-xl font-bold text-text-primary">{s.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary text-sm">Últimas tareas</h3>
            <Link href={`/proyecto/${token}/tareas`} className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1">
              Ver todas <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">Sin tareas todavía</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentTasks.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${t.isCompleted ? "text-text-secondary line-through" : "text-text-primary font-medium"}`}>{t.title}</span>
                  <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${t.isCompleted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {t.isCompleted ? "Hecha" : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary text-sm">Últimos docs</h3>
            <Link href={`/proyecto/${token}/docs`} className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1">
              Ver todos <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>
          {docsRelations.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">Sin documentos vinculados todavía</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {docsRelations.map((r) => (
                <li key={r.id} className="py-2.5">
                  <Link href={`/proyecto/${token}/docs/${r.page.id}`} className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-action-primary">
                    <PageIcon emoji={r.page.emoji} isFolder={r.page.isFolder} size={15} />
                    <span className="truncate">{r.page.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-sm">Últimos registros</h3>
          <Link href={`/proyecto/${token}/registros`} className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1">
            Ver todos <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
          </Link>
        </div>
        {recentSubmissions.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">Sin registros de formularios todavía</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentSubmissions.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary truncate block">
                    {c.firstName} {c.lastName || ""}
                  </span>
                  {c.sourceForm?.name && (
                    <span className="text-[11px] text-text-secondary">{c.sourceForm.name}</span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-text-secondary">
                  {c.createdAt.toLocaleDateString("es-MX")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
