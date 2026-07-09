import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultipleIcon,
  Calendar01Icon,
  Task01Icon,
  Clock01Icon,
  DollarCircleIcon,
  Money02Icon,
  FolderKanbanIcon,
} from "@hugeicons/core-free-icons";
import { EmptyState } from "@/src/components/dashboard/EmptyState";
import { formatCurrency } from "@/src/lib/format";
import type { DashboardData, DataKey } from "@/src/lib/dashboardData";

export interface TabDefinition {
  id: string;
  label: string;
  icon: any;
  href: string;
  dataKey: DataKey;
  count: (data: DashboardData) => number;
  render: (data: DashboardData) => React.ReactNode;
}

function formatDate(date: Date) {
  if (isToday(date)) return "Hoy, " + format(date, "h:mm a", { locale: es });
  if (isTomorrow(date)) return "Mañana, " + format(date, "h:mm a", { locale: es });
  return format(date, "dd MMM, h:mm a", { locale: es });
}

function formatShortDate(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "dd MMM", { locale: es });
}

const COL_SPAN_CLASS: Record<number, string> = {
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  7: "col-span-7",
};

function TableHeader({ columns }: { columns: { label: string; span: number }[] }) {
  return (
    <div className="grid grid-cols-12 px-6 py-3 bg-surface-sidebar/60 border-b border-border-subtle">
      {columns.map((c) => (
        <span key={c.label} className={`${COL_SPAN_CLASS[c.span]} text-[10px] font-semibold text-text-secondary uppercase tracking-widest`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: "green" | "blue" | "orange" | "gray" }) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wide ${colors[color]}`}>
      {text}
    </span>
  );
}

export const TAB_REGISTRY: TabDefinition[] = [
  {
    id: "latest_leads",
    label: "Últimos Leads",
    icon: UserMultipleIcon,
    href: "/contacts",
    dataKey: "latestContacts",
    count: (d) => d.latestContacts?.length ?? 0,
    render: (d) => {
      const contacts = d.latestContacts ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Fecha", span: 2 }, { label: "Nombre", span: 3 }, { label: "Email", span: 5 }, { label: "Estado", span: 2 }]} />
          {contacts.length > 0 ? (
            contacts.map((contact, i) => (
              <div key={contact.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < contacts.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-text-secondary tabular-nums">{formatShortDate(new Date(contact.createdAt))}</span>
                </div>
                <span className="col-span-3 text-sm font-medium text-text-primary truncate pr-3">{contact.firstName} {contact.lastName || ""}</span>
                <span className="col-span-5 text-sm text-text-secondary truncate pr-3">{contact.email || "—"}</span>
                <span className="col-span-2"><Badge text="ACTIVO" color="green" /></span>
              </div>
            ))
          ) : (
            <EmptyState icon={UserMultipleIcon} message="No hay contactos registrados" />
          )}
        </div>
      );
    },
  },
  {
    id: "upcoming_appointments_list",
    label: "Próximas Citas",
    icon: Calendar01Icon,
    href: "/appointments",
    dataKey: "upcomingAppointments",
    count: (d) => d.upcomingAppointments?.length ?? 0,
    render: (d) => {
      const appointments = d.upcomingAppointments ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Fecha", span: 3 }, { label: "Nombre", span: 4 }, { label: "Tipo", span: 3 }, { label: "Estado", span: 2 }]} />
          {appointments.length > 0 ? (
            appointments.map((appt, i) => (
              <div key={appt.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < appointments.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: appt.appointmentType.color }} />
                  <span className="text-xs text-text-secondary tabular-nums flex items-center gap-1">
                    <HugeiconsIcon icon={Clock01Icon} size={11} color="#9ca3af" />
                    {formatDate(new Date(appt.startTime))}
                  </span>
                </div>
                <span className="col-span-4 text-sm font-medium text-text-primary truncate pr-3">{appt.guestName}</span>
                <span className="col-span-3 text-sm text-text-secondary truncate pr-3">{appt.appointmentType.name}</span>
                <span className="col-span-2"><Badge text="CITA" color="blue" /></span>
              </div>
            ))
          ) : (
            <EmptyState icon={Calendar01Icon} message="No hay citas próximas" />
          )}
        </div>
      );
    },
  },
  {
    id: "pending_tasks_list",
    label: "Tareas Pendientes",
    icon: Task01Icon,
    href: "/tasks",
    dataKey: "pendingTasks",
    count: (d) => d.pendingTasks?.length ?? 0,
    render: (d) => {
      const tasks = d.pendingTasks ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Tarea", span: 7 }, { label: "Vencimiento", span: 3 }, { label: "Estado", span: 2 }]} />
          {tasks.length > 0 ? (
            tasks.map((task, i) => (
              <div key={task.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < tasks.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-7 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-sm font-medium text-text-primary line-clamp-1 pr-3">{task.title}</span>
                </div>
                <span className="col-span-3 text-xs text-text-secondary">
                  {task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: es }) : "—"}
                </span>
                <span className="col-span-2"><Badge text="PENDIENTE" color="orange" /></span>
              </div>
            ))
          ) : (
            <EmptyState icon={Task01Icon} message="No hay tareas pendientes" />
          )}
        </div>
      );
    },
  },
  {
    id: "recent_deals",
    label: "Deals Recientes",
    icon: DollarCircleIcon,
    href: "/pipeline",
    dataKey: "recentDeals",
    count: (d) => d.recentDeals?.length ?? 0,
    render: (d) => {
      const deals = d.recentDeals ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Fecha", span: 2 }, { label: "Título", span: 4 }, { label: "Etapa", span: 3 }, { label: "Valor", span: 3 }]} />
          {deals.length > 0 ? (
            deals.map((deal, i) => (
              <div key={deal.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < deals.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: deal.stage.color }} />
                  <span className="text-xs text-text-secondary tabular-nums">{formatShortDate(new Date(deal.createdAt))}</span>
                </div>
                <span className="col-span-4 text-sm font-medium text-text-primary truncate pr-3">{deal.title}</span>
                <span className="col-span-3 text-sm text-text-secondary truncate pr-3">{deal.stage.name}</span>
                <span className="col-span-3 text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(deal.value ?? 0)}</span>
              </div>
            ))
          ) : (
            <EmptyState icon={DollarCircleIcon} message="No hay deals registrados" />
          )}
        </div>
      );
    },
  },
  {
    id: "recent_payments_list",
    label: "Pagos Recientes",
    icon: Money02Icon,
    href: "/pipeline",
    dataKey: "recentPayments",
    count: (d) => d.recentPayments?.length ?? 0,
    render: (d) => {
      const payments = d.recentPayments ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Fecha", span: 2 }, { label: "Deal / Cliente", span: 5 }, { label: "Monto", span: 3 }, { label: "Estado", span: 2 }]} />
          {payments.length > 0 ? (
            payments.map((p, i) => (
              <div key={p.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < payments.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-2 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === "RECIBIDO" ? "bg-green-400" : "bg-orange-400"}`} />
                  <span className="text-xs text-text-secondary tabular-nums">{formatShortDate(new Date(p.createdAt))}</span>
                </div>
                <span className="col-span-5 text-sm font-medium text-text-primary truncate pr-3">{p.label}</span>
                <span className="col-span-3 text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(p.amount)}</span>
                <span className="col-span-2">
                  <Badge text={p.status} color={p.status === "RECIBIDO" ? "green" : p.status === "PENDIENTE" ? "orange" : "gray"} />
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={Money02Icon} message="No hay pagos registrados" />
          )}
        </div>
      );
    },
  },
  {
    id: "recent_projects_list",
    label: "Proyectos Recientes",
    icon: FolderKanbanIcon,
    href: "/projects",
    dataKey: "recentProjects",
    count: (d) => d.recentProjects?.length ?? 0,
    render: (d) => {
      const projects = d.recentProjects ?? [];
      return (
        <div>
          <TableHeader columns={[{ label: "Fecha", span: 2 }, { label: "Nombre", span: 5 }, { label: "Descripción", span: 5 }]} />
          {projects.length > 0 ? (
            projects.map((project, i) => (
              <div key={project.id} className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-surface-sidebar/50 transition-colors ${i < projects.length - 1 ? "border-b border-border-subtle" : ""}`}>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs text-text-secondary tabular-nums">{formatShortDate(new Date(project.createdAt))}</span>
                </div>
                <span className="col-span-5 text-sm font-medium text-text-primary truncate pr-3">{project.name}</span>
                <span className="col-span-5 text-sm text-text-secondary truncate pr-3">{project.description || "—"}</span>
              </div>
            ))
          ) : (
            <EmptyState icon={FolderKanbanIcon} message="No hay proyectos creados" />
          )}
        </div>
      );
    },
  },
];

export const TAB_MAP: Record<string, TabDefinition> = Object.fromEntries(TAB_REGISTRY.map((t) => [t.id, t]));

export const DEFAULT_TABS: string[] = ["latest_leads", "upcoming_appointments_list", "pending_tasks_list"];
