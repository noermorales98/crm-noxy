import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkSquare01Icon, FolderIcon, BrowserIcon, Mail01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findFirst({ where: { id, organizationId: currentOrganizationId } });
  if (!project) return notFound();

  const [pendingTasksCount, tasksTotal, recentTasks, formsCount, campaignsCount, docsCount, docsRelations] = await Promise.all([
    prisma.task.count({ where: { projectId: id, isCompleted: false } }),
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.form.count({ where: { projectId: id } }),
    prisma.emailCampaign.count({ where: { projectId: id } }),
    prisma.kbPageRelation.count({ where: { entityType: "PROJECT", entityId: id } }),
    prisma.kbPageRelation.findMany({
      where: { entityType: "PROJECT", entityId: id },
      include: { page: { select: { id: true, title: true, emoji: true, isFolder: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Tareas pendientes", value: pendingTasksCount, icon: CheckmarkSquare01Icon, color: "#ef4444", href: `/projects/${id}/tareas` },
    { label: "Docs vinculados", value: docsCount, icon: FolderIcon, color: "#0891b2", href: `/projects/${id}/docs` },
    { label: "Formularios", value: formsCount, icon: BrowserIcon, color: "#22c55e", href: `/projects/${id}/info` },
    { label: "Campañas", value: campaignsCount, icon: Mail01Icon, color: "#f97316", href: `/projects/${id}/info` },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <Link href={`/projects/${id}/tareas`} className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1">
              Ver todas <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">Sin tareas vinculadas todavía</p>
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
          {tasksTotal > 0 && (
            <p className="text-xs text-text-secondary mt-3 pt-3 border-t border-border-subtle">{tasksTotal} tareas en total</p>
          )}
        </div>

        <div className="bg-white border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary text-sm">Últimos docs</h3>
            <Link href={`/projects/${id}/docs`} className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1">
              Ver todos <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>
          {docsRelations.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">Sin documentos vinculados todavía</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {docsRelations.map((r) => (
                <li key={r.id} className="py-2.5">
                  <Link href={`/kb/${r.page.id}`} className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-action-primary">
                    <PageIcon emoji={r.page.emoji} isFolder={r.page.isFolder} size={15} />
                    <span className="truncate">{r.page.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
