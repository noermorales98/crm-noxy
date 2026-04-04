import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultipleIcon,
  CalendarCheckIn01Icon,
  Task01Icon,
  Mail01Icon,
  FolderKanbanIcon,
} from "@hugeicons/core-free-icons";

interface ShortcutMetric {
  title: string;
  value: number;
  href: string;
  icon: any;
  description: string;
  color: string;
}

interface DashboardShortcutsProps {
  contactsCount?: number;
  appointmentsCount?: number;
  tasksCount?: number;
  campaignsCount?: number;
  projectsCount?: number;
}

export function DashboardShortcuts({
  contactsCount = 0,
  appointmentsCount = 0,
  tasksCount = 0,
  campaignsCount = 0,
  projectsCount = 0,
}: DashboardShortcutsProps) {
  const metrics: ShortcutMetric[] = [
    {
      title: "Contactos",
      value: contactsCount,
      href: "/contacts",
      icon: UserMultipleIcon,
      description: "Leads registrados",
      color: "#3b82f6",
    },
    {
      title: "Citas",
      value: appointmentsCount,
      href: "/appointments",
      icon: CalendarCheckIn01Icon,
      description: "Próximas citas",
      color: "#8b5cf6",
    },
    {
      title: "Tareas",
      value: tasksCount,
      href: "/tasks",
      icon: Task01Icon,
      description: "Pendientes",
      color: "#f97316",
    },
    {
      title: "Campañas",
      value: campaignsCount,
      href: "/campaigns",
      icon: Mail01Icon,
      description: "Activas",
      color: "#ec4899",
    },
    {
      title: "Proyectos",
      value: projectsCount,
      href: "/projects",
      icon: FolderKanbanIcon,
      description: "En progreso",
      color: "#10b981",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <Link
          key={metric.title}
          href={metric.href}
          className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{metric.title}</span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${metric.color}15` }}
            >
              <HugeiconsIcon icon={metric.icon} size={15} color={metric.color} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{metric.value}</p>
          <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
        </Link>
      ))}
    </div>
  );
}
