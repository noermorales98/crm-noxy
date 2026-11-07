"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, FolderIcon, ArrowRight01Icon, ZapIcon, AnalyticsUpIcon, GitBranchIcon, Megaphone01Icon } from "@hugeicons/core-free-icons";
import DeleteProjectButton from "@/src/components/DeleteProjectButton";
import { useHeader } from "@/src/context/HeaderContext";
import { DataList, EmptyState, Enter, ErrorState, PageHeader, Skeleton } from "@/src/components/ui";

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

  const renderProject = (project: ProjectRow) => {
    const total = assetsOf(project);
    return (
      <div className="flex w-full min-w-0 items-center gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="group flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-sidebar text-text-primary">
            <HugeiconsIcon icon={PROJECT_ICONS[project.icon || ""] ?? FolderIcon} size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-text-primary group-hover:underline">{project.name}</span>
            <span className="mt-0.5 block truncate text-sm text-text-secondary">{project.description || "Sin descripción."}</span>
            {(project.clientCompany || project.client || project.contact) && (
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {/* Colores de categoría de la asociación (empresa, cliente, contacto): se conservan. */}
                {project.clientCompany && <span className="rounded-full bg-nav-hover px-2 py-0.5 text-xs font-semibold text-action-primary">{project.clientCompany.name}</span>}
                {project.client && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{project.client.name}</span>}
                {project.contact && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">{project.contact.firstName} {project.contact.lastName || ""}</span>}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-text-secondary sm:text-sm">
            {total} {total === 1 ? "asset" : "assets"}
          </span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="shrink-0 text-text-secondary" />
        </Link>
        <DeleteProjectButton
          projectId={project.id}
          projectName={project.name}
          onDeleted={() => setProjects((prev) => prev.filter((p) => p.id !== project.id))}
        />
      </div>
    );
  };

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
            <DataList
              label="Proyectos"
              rows={displayed}
              getKey={(p) => p.id}
              renderRow={renderProject}
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
