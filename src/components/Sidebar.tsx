"use client";
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Building04Icon,
  UserMultipleIcon,
  Task01Icon,
  Mail01Icon,
  InboxIcon,
  BrowserIcon,
  Calendar01Icon,
  Clock01Icon,
  CalendarCheckIn01Icon,
  FolderKanbanIcon,
  GlobeIcon,
  Add01Icon,
  ZapIcon,
  Analytics01Icon,
  Megaphone01Icon,
  GitBranchIcon,
  BarChartIcon,
} from "@hugeicons/core-free-icons";

export default function Sidebar() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/projects?limit=5")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setProjects(data);
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [session]);

  return (
    <aside className="w-60 bg-white h-screen flex flex-col border-r border-gray-100 flex-shrink-0 overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-2.5 shrink-0 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <HugeiconsIcon icon={GlobeIcon} size={16} color="white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-gray-900">Noxy CRM</span>
      </div>

      {/* Scrollable Nav */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Main */}
        <div className="px-3 flex flex-col gap-0.5">
          <NavItem href="/" icon={Home01Icon} label="Inicio" />
          <NavItem href="/companies" icon={Building04Icon} label="Empresas" />
          <NavItem href="/contacts" icon={UserMultipleIcon} label="Contactos" />
          <NavItem href="/tasks" icon={Task01Icon} label="Tareas" />
          <NavItem href="/pipeline" icon={BarChartIcon} label="Ventas" />
          <NavItem href="/campaigns" icon={Mail01Icon} label="Campañas de Email" />
          <NavItem href="/emails" icon={InboxIcon} label="Correos" />
          <NavItem href="/forms" icon={BrowserIcon} label="Formularios" />
        </div>

        {/* Calendario */}
        <div className="px-3 mt-5 flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Calendario</p>
          <NavItem href="/appointment-types" icon={Calendar01Icon} label="Tipos de Cita" />
          <NavItem href="/availability" icon={Clock01Icon} label="Disponibilidad" />
          <NavItem href="/appointments" icon={CalendarCheckIn01Icon} label="Citas Agendadas" />
        </div>

        {/* Proyectos */}
        <div className="px-3 mt-5">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Proyectos</p>
            <Link href="/projects/create" className="text-gray-400 hover:text-gray-700 transition-colors">
              <HugeiconsIcon icon={Add01Icon} size={14} />
            </Link>
          </div>
          <div className="flex flex-col gap-0.5">
            {projects.map((project: any) => {
              const assetCount =
                (project._count?.forms || 0) +
                (project._count?.campaigns || 0) +
                (project._count?.contacts || 0) +
                (project._count?.companies || 0) +
                (project._count?.tasks || 0);
              const iconMap: Record<string, any> = {
                "zap": ZapIcon,
                "trending-up": Analytics01Icon,
                "git-branch": GitBranchIcon,
                "megaphone": Megaphone01Icon,
              };
              const ProjectIcon = iconMap[project.icon] || FolderKanbanIcon;

              return (
                <ProjectNavItem
                  key={project.id}
                  href={`/projects/${project.id}`}
                  icon={ProjectIcon}
                  label={project.name}
                  count={assetCount}
                />
              );
            })}
            <Link
              href="/projects"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors rounded-xl"
            >
              Ver todos ({projects.length})
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, href }: { icon: any; label: string; href: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all text-sm ${
        isActive
          ? "bg-gray-900 text-white font-medium"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <HugeiconsIcon icon={icon} size={16} color={isActive ? "white" : "currentColor"} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function ProjectNavItem({ href, icon, label, count }: { href: string; icon: any; label: string; count: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-sm group ${
        isActive
          ? "bg-gray-900 text-white"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={icon} size={14} color={isActive ? "white" : "currentColor"} />
        <span className="truncate text-xs">{label}</span>
      </div>
      {count > 0 && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
          isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
        }`}>
          {count}
        </span>
      )}
    </Link>
  );
}
