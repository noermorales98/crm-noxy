"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, FolderIcon, ZapIcon, AnalyticsUpIcon, GitBranchIcon, Megaphone01Icon } from "@hugeicons/core-free-icons";
import DeleteProjectButton from "@/src/components/DeleteProjectButton";
import { useHeader } from "@/src/context/HeaderContext";
import { DataTable, EmptyState, Enter, ErrorState, PageHeader, Skeleton } from "@/src/components/ui";

type ProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  createdAt?: string;
  clientCompany?: { name: string } | null;
  client?: { name: string } | null;
  contact?: { firstName: string; lastName?: string | null } | null;
  _count?: { forms?: number; campaigns?: number; tasks?: number };
};

const PROJECT_ICONS: Record<string, typeof FolderIcon> = {
  zap: ZapIcon,
  "trending-up": AnalyticsUpIcon,
  "git-branch": GitBranchIcon,
  megaphone: Megaphone01Icon,
};

const assetsOf = (p: ProjectRow) => (p._count?.forms || 0) + (p._count?.campaigns || 0) + (p._count?.tasks || 0);

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10";

export default function ProjectsPage() {
  const { setConfig, resetState, sortField, sortOrder } = useHeader();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Proyectos",
      titleBadge: isLoading ? undefined : projects.length,
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Assets", value: "assets" },
      ],
      pageHeader: true,
    });
    return () => setConfig({});
  }, [isLoading, projects.length]);

  const fetchProjects = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/projects");
      const data = res.ok ? await res.json() : null;
      if (Array.isArray(data)) setProjects(data);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const displayed = useMemo(() => {
    if (!sortField) return projects;
    return [...projects].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortField === "name") { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
      else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
      else if (sortField === "assets") { aVal = assetsOf(a); bVal = assetsOf(b); }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [projects, sortField, sortOrder]);

  const assoc = (p: ProjectRow) =>
    p.clientCompany?.name || p.client?.name || (p.contact ? `${p.contact.firstName} ${p.contact.lastName || ""}`.trim() : "");
  const projectCell = (project: ProjectRow) => (
    <Link
      href={`/projects/${project.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]">
        <HugeiconsIcon icon={PROJECT_ICONS[project.icon || ""] ?? FolderIcon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-text-primary group-hover:underline">{project.name}</span>
        <span className="block max-w-md truncate text-xs text-text-secondary">{project.description || "Sin descripción."}</span>
      </span>
    </Link>
  );
  const removeButton = (project: ProjectRow) => (
    <DeleteProjectButton
      projectId={project.id}
      projectName={project.name}
      onDeleted={() => setProjects((prev) => prev.filter((p) => p.id !== project.id))}
    />
  );
  const columns = [
    { key: "name", header: "Proyecto", render: projectCell },
    { key: "assoc", header: "Asociado a", render: (p: ProjectRow) => <span className="text-text-secondary">{assoc(p) || "—"}</span> },
    { key: "assets", header: "Assets", align: "right" as const, render: (p: ProjectRow) => assetsOf(p) },
    {
      key: "created",
      header: "Creado",
      render: (p: ProjectRow) => <span className="text-text-secondary">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>,
    },
    { key: "actions", header: "Acciones", align: "right" as const, render: removeButton },
  ];
  const mobileRow = (project: ProjectRow) => (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">{projectCell(project)}</div>
      <span className="shrink-0 text-xs tabular-nums text-text-secondary">{assetsOf(project)}</span>
      {removeButton(project)}
    </div>
  );

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Proyectos"
          subtitle={isLoading ? "Cargando proyectos…" : "Organiza tareas, correo y documentación alrededor de un cliente, empresa o contacto."}
          actions={
            <Link href="/projects/create" className={primaryAction}>
              <HugeiconsIcon icon={Add01Icon} size={16} />
              Nuevo proyecto
            </Link>
          }
        />
      </Enter>
      <Enter index={1}>
        {isLoading && projects.length === 0 ? (
          <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <Skeleton shape="rows" count={4} label="Cargando proyectos" />
          </div>
        ) : loadError && projects.length === 0 ? (
          <div className="rounded-surface border border-line bg-surface-elevated">
            <ErrorState title="No se pudieron cargar los proyectos" onRetry={fetchProjects} />
          </div>
        ) : (
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <DataTable
              label="Proyectos"
              columns={columns}
              rows={displayed}
              getKey={(p) => p.id}
              mobileRow={mobileRow}
              empty={
                <EmptyState
                  title="Todavía no hay proyectos"
                  body="Agrupa formularios, campañas, contactos y empresas creando tu primer proyecto."
                  action={
                    <Link href="/projects/create" className={primaryAction}>
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                      Crear el primer proyecto
                    </Link>
                  }
                />
              }
            />
          </section>
        )}
      </Enter>
    </main>
  );
}
