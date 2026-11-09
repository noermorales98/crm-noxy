import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckmarkSquare01Icon, FolderIcon, UserMultipleIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";
import { KpiWidget } from "@/src/components/dashboard/KpiWidget";
import { Block, Chip, DataList, EmptyState } from "@/src/components/ui";

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findFirst({ where: { id, organizationId: currentOrganizationId } });
  if (!project) return notFound();

  const [pendingTasksCount, tasksTotal, recentTasks, forms, campaignsCount, docsCount, docsRelations] = await Promise.all([
    prisma.task.count({ where: { projectId: id, isCompleted: false } }),
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.form.findMany({ where: { projectId: id }, select: { id: true } }),
    prisma.emailCampaign.count({ where: { projectId: id } }),
    prisma.kbPageRelation.count({ where: { entityType: "PROJECT", entityId: id } }),
    prisma.kbPageRelation.findMany({
      where: { entityType: "PROJECT", entityId: id },
      include: { page: { select: { id: true, title: true, emoji: true, isFolder: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const formIds = forms.map((f) => f.id);
  const [submissionsCount, recentSubmissions] = formIds.length === 0
    ? [0, [] as { id: string; firstName: string; lastName: string | null; createdAt: Date; sourceForm: { name: string } | null }[]]
    : await Promise.all([
        prisma.contact.count({ where: { organizationId: currentOrganizationId, sourceFormId: { in: formIds } } }),
        prisma.contact.findMany({
          where: { organizationId: currentOrganizationId, sourceFormId: { in: formIds } },
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

  // Cifras con el mismo componente que el Inicio: círculo de un solo tono y tarjeta con borde.
  const stats = [
    { label: "Tareas pendientes", value: pendingTasksCount, icon: CheckmarkSquare01Icon, href: `/projects/${id}/tareas` },
    { label: "Docs vinculados", value: docsCount, icon: FolderIcon, href: `/projects/${id}/docs` },
    { label: "Registrados", value: submissionsCount, icon: UserMultipleIcon, href: `/projects/${id}/registros` },
    { label: "Campañas", value: campaignsCount, icon: Mail01Icon, href: `/projects/${id}/info` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <KpiWidget
            key={s.label}
            icon={s.icon}
            iconBg="var(--color-nav-active)"
            iconColor="var(--nav-active-ink)"
            value={String(s.value)}
            label={s.label}
            href={s.href}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Block title="Últimas tareas" action={{ label: "Ver todas", href: `/projects/${id}/tareas` }}>
          <DataList
            label="Últimas tareas"
            rows={recentTasks}
            getKey={(t) => t.id}
            empty={<EmptyState title="Sin tareas vinculadas todavía" />}
            renderRow={(t) => (
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <span className={`truncate text-sm ${t.isCompleted ? "text-text-secondary line-through" : "font-medium text-text-primary"}`}>{t.title}</span>
                <Chip tone={t.isCompleted ? "done" : "neutral"}>{t.isCompleted ? "Hecha" : "Pendiente"}</Chip>
              </div>
            )}
          />
          {tasksTotal > 0 && <p className="border-t border-line px-4 py-3 text-xs text-text-secondary sm:px-5">{tasksTotal} tareas en total</p>}
        </Block>

        <Block title="Últimos docs" action={{ label: "Ver todos", href: `/projects/${id}/docs` }}>
          <DataList
            label="Últimos docs"
            rows={docsRelations}
            getKey={(r) => r.id}
            empty={<EmptyState title="Sin documentos vinculados todavía" />}
            renderRow={(r) => (
              <Link href={`/kb/${r.page.id}`} className="flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium text-text-primary hover:underline">
                <PageIcon emoji={r.page.emoji} isFolder={r.page.isFolder} size={15} />
                <span className="truncate">{r.page.title}</span>
              </Link>
            )}
          />
        </Block>
      </div>

      <Block title="Últimos registros" action={{ label: "Ver todos", href: `/projects/${id}/registros` }}>
        <DataList
          label="Últimos registros"
          rows={recentSubmissions}
          getKey={(c) => c.id}
          empty={<EmptyState title="Sin registros de formularios todavía" />}
          renderRow={(c) => (
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {c.firstName} {c.lastName || ""}
                </span>
                {c.sourceForm?.name && <span className="block truncate text-xs text-text-secondary">{c.sourceForm.name}</span>}
              </div>
              <span className="shrink-0 text-xs text-text-secondary">{c.createdAt.toLocaleDateString("es-MX")}</span>
            </div>
          )}
        />
        {submissionsCount > 0 && <p className="border-t border-line px-4 py-3 text-xs text-text-secondary sm:px-5">{submissionsCount} registros en total</p>}
      </Block>
    </div>
  );
}
