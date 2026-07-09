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
}

export default function ProjectWorkspaceHeader({ project, tasksCount, docsCount }: ProjectWorkspaceHeaderProps) {
  const pathname = usePathname();
  const base = `/projects/${project.id}`;

  const tabs = [
    { href: base, label: "Resumen", exact: true },
    { href: `${base}/tareas`, label: "Tareas", count: tasksCount },
    { href: `${base}/docs`, label: "Docs", count: docsCount },
    ...(project.emailAccountCompanyId ? [{ href: `${base}/correo`, label: "Correo" }] : []),
    { href: `${base}/info`, label: "Info" },
    { href: `${base}/actividad`, label: "Actividad" },
  ];

  return (
    <div className="border-b border-border-subtle px-6 pt-4 shrink-0">
      <div className="max-w-5xl mx-auto w-full">
        {(project.clientCompany || project.client || project.contact || project.emailAccountCompany || project.clientId) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {project.clientCompany && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                <HugeiconsIcon icon={Building04Icon} size={11} />
                {project.clientCompany.name}
              </span>
            )}
            {project.client && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <HugeiconsIcon icon={Money02Icon} size={11} />
                {project.client.name}
              </span>
            )}
            {project.contact && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">
                <HugeiconsIcon icon={UserMultipleIcon} size={11} />
                {project.contact.firstName} {project.contact.lastName || ""}
              </span>
            )}
            {project.emailAccountCompany && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                <HugeiconsIcon icon={Mail01Icon} size={11} />
                {project.emailAccountCompany.name}
              </span>
            )}
            {project.clientId && (
              <Link href="/pipeline/clientes" className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-nav-hover px-2.5 py-1 rounded-full transition-colors">
                <HugeiconsIcon icon={LockPasswordIcon} size={11} />
                Ver bóveda
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname === tab.href || pathname?.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  isActive ? "border-accent-charcoal text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
                {"count" in tab && tab.count! > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-accent-charcoal text-white" : "bg-gray-100 text-text-secondary"}`}>
                    {tab.count! > 99 ? "99+" : tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
