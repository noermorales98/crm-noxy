"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building04Icon,
  Money02Icon,
  UserMultipleIcon,
  Mail01Icon,
  LockPasswordIcon,
} from "@hugeicons/core-free-icons";
import ProjectSharePanel from "@/src/components/ProjectSharePanel";
import { PageHeader } from "@/src/components/ui";
interface ProjectWorkspaceHeaderProps {
  project: {
    id: string;
    name: string;
    icon: string | null;
    companyId: string | null;
    contactId: string | null;
    clientId: string | null;
    emailAccountCompanyId: string | null;
    clientCompany: { id: string; name: string } | null;
    contact: { id: string; firstName: string; lastName: string | null } | null;
    client: { id: string; name: string } | null;
    emailAccountCompany: { id: string; name: string } | null;
  };
  tasksCount: number;
  docsCount: number;
  submissionsCount: number;
}

export default function ProjectWorkspaceHeader({ project, tasksCount, docsCount, submissionsCount }: ProjectWorkspaceHeaderProps) {
  const pathname = usePathname();
  const base = `/projects/${project.id}`;

  const tabs = [
    { href: base, label: "Resumen", exact: true },
    { href: `${base}/tareas`, label: "Tareas", count: tasksCount },
    { href: `${base}/docs`, label: "Docs", count: docsCount },
    { href: `${base}/registros`, label: "Registrados", count: submissionsCount },
    ...(project.emailAccountCompanyId ? [{ href: `${base}/correo`, label: "Correo" }] : []),
    { href: `${base}/info`, label: "Info" },
    { href: `${base}/actividad`, label: "Actividad" },
  ];

  const chip = "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs font-medium text-text-secondary-strong";
  const hasAssociations = project.clientCompany || project.client || project.contact || project.emailAccountCompany || project.clientId;

  return (
    <div className="shrink-0 border-b border-line px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          title={project.name}
          subtitle={
            hasAssociations ? (
              // Asociaciones del proyecto: chips de un solo tono, con su icono.
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {project.clientCompany && (
                  <span className={`${chip}`}>
                    <HugeiconsIcon icon={Building04Icon} size={12} />
                    {project.clientCompany.name}
                  </span>
                )}
                {project.client && (
                  <span className={`${chip}`}>
                    <HugeiconsIcon icon={Money02Icon} size={12} />
                    {project.client.name}
                  </span>
                )}
                {project.contact && (
                  <span className={`${chip}`}>
                    <HugeiconsIcon icon={UserMultipleIcon} size={12} />
                    {project.contact.firstName} {project.contact.lastName || ""}
                  </span>
                )}
                {project.emailAccountCompany && (
                  <span className={`${chip}`}>
                    <HugeiconsIcon icon={Mail01Icon} size={12} />
                    {project.emailAccountCompany.name}
                  </span>
                )}
                {project.clientId && (
                  <Link
                    href="/pipeline/clientes"
                    className={`${chip} min-h-11 border border-line text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:min-h-7`}
                  >
                    <HugeiconsIcon icon={LockPasswordIcon} size={12} />
                    Ver bóveda
                  </Link>
                )}
              </span>
            ) : undefined
          }
          actions={<ProjectSharePanel projectId={project.id} />}
        />

        <nav aria-label="Secciones del proyecto" className="flex flex-wrap items-center gap-1 pb-4">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname === tab.href || pathname?.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus lg:min-h-9 ${
                  isActive
                    ? "border-line bg-nav-active font-semibold text-[var(--nav-active-ink)]"
                    : "border-transparent font-medium text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary"
                }`}
              >
                {tab.label}
                {"count" in tab && tab.count! > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${isActive ? "bg-surface-elevated text-[var(--nav-active-ink)]" : "border border-line text-text-secondary"}`}>
                    {tab.count! > 99 ? "99+" : tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
