"use client";
import Link from 'next/link';
import { LayoutDashboard, CheckSquare, Activity, Users, Zap, TrendingUp, GitBranch, Megaphone, Plus, Mail, AppWindow, CalendarCheck, Clock, CalendarDays, Inbox } from "lucide-react";
import Image from "next/image";
import { PROJECTS } from "@/src/lib/mockData";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<any[]>([]);
  
  useEffect(() => {
    if (session?.user) {
      fetch("/api/projects?limit=5")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProjects(data);
          }
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [session]);

  return (
    <aside className="w-64 bg-white h-screen flex flex-col border-r border-gray-100 flex-shrink-0 overflow-hidden">
      {/* Brand (Fixed Top) */}
      <div className="p-6 flex items-center gap-2 shrink-0">
        <div className="text-xl font-bold tracking-tight text-gray-900">Noxy CRM</div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {/* Main Nav */}
        <div className="px-4 py-2 flex flex-col gap-1">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavItem href="/companies" icon={<Activity size={20} />} label="Empresas" />
          <NavItem href="/contacts" icon={<Users size={20} />} label="Contactos" />
          <NavItem href="/tasks" icon={<CheckSquare size={20} />} label="Tareas" />
          <NavItem href="/campaigns" icon={<Mail size={20} />} label="Campañas de Email" />
          <NavItem href="/emails" icon={<Inbox size={20} />} label="Correos" />
          <NavItem href="/forms" icon={<AppWindow size={20} />} label="Formularios y Captación" />
        </div>

        {/* Calendario */}
        <div className="px-4 py-2 flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Calendario</p>
          <NavItem href="/appointment-types" icon={<CalendarDays size={20} />} label="Tipos de Cita" />
          <NavItem href="/availability" icon={<Clock size={20} />} label="Disponibilidad" />
          <NavItem href="/appointments" icon={<CalendarCheck size={20} />} label="Citas Agendadas" />
        </div>

        {/* Projects */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Proyectos</h3>
            <Link href="/projects/create" className="text-gray-400 hover:text-gray-900 transition-colors">
              <Plus size={16} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {projects.map((project: any) => {
              // Calculate total assets in this project based on relational counts
              const assetCount = (project._count?.forms || 0) + (project._count?.campaigns || 0) + (project._count?.contacts || 0) + (project._count?.companies || 0) + (project._count?.tasks || 0);

              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between text-gray-600 hover:text-gray-900 cursor-pointer group">
                  <div className="flex items-center gap-2">
                    {project.icon === "zap" && <Zap size={18} className="text-gray-400 group-hover:text-gray-900" />}
                    {project.icon === "trending-up" && <TrendingUp size={18} className="text-gray-400 group-hover:text-gray-900" />}
                    {project.icon === "git-branch" && <GitBranch size={18} className="text-gray-400 group-hover:text-gray-900" />}
                    {project.icon === "megaphone" && <Megaphone size={18} className="text-gray-400 group-hover:text-gray-900" />}
                    {!["zap", "trending-up", "git-branch", "megaphone"].includes(project.icon) && <LayoutDashboard size={18} className="text-gray-400 group-hover:text-gray-900" />}
                    <span className="text-sm font-medium w-32 truncate">{project.name}</span>
                  </div>
                  {assetCount > 0 && (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{assetCount}</span>
                  )}
                </Link>
              );
            })}
            
            <Link href="/projects" className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 px-1">
              Ver todos ({projects.length > 0 ? projects.length : 0})
            </Link>
          </div>
        </div>

      </div>
    </aside>
  );
}

function NavItem({ icon, label, href }: { icon: React.ReactNode, label: string, href: string, badge?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
    </Link>
  );
}
