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
  iconBg: string;
  iconColor: string;
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
      iconBg: "#E1F0FF",
      iconColor: "#337EA9",
    },
    {
      title: "Citas",
      value: appointmentsCount,
      href: "/appointments",
      icon: CalendarCheckIn01Icon,
      description: "Próximas citas",
      iconBg: "#F0E6F9",
      iconColor: "#9065B0",
    },
    {
      title: "Tareas",
      value: tasksCount,
      href: "/tasks",
      icon: Task01Icon,
      description: "Pendientes",
      iconBg: "#FFECD2",
      iconColor: "#D9730D",
    },
    {
      title: "Campañas",
      value: campaignsCount,
      href: "/campaigns",
      icon: Mail01Icon,
      description: "Activas",
      iconBg: "#FFE2E2",
      iconColor: "#D44020",
    },
    {
      title: "Proyectos",
      value: projectsCount,
      href: "/projects",
      icon: FolderKanbanIcon,
      description: "En progreso",
      iconBg: "#E2F6E9",
      iconColor: "#448361",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <Link
          key={metric.title}
          href={metric.href}
          className="bg-surface-elevated rounded-lg p-5 hover:bg-nav-hover transition-colors group flex flex-col"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
            style={{ backgroundColor: metric.iconBg }}
          >
            <HugeiconsIcon icon={metric.icon} size={16} color={metric.iconColor} />
          </div>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{metric.value}</p>
          <p className="text-xs text-text-secondary mt-1">{metric.description}</p>
          <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider mt-3">{metric.title}</p>
        </Link>
      ))}
    </div>
  );
}
