import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  UserMultipleIcon,
  Calendar01Icon,
  CalendarCheckIn01Icon,
  Task01Icon,
  Mail01Icon,
  FolderKanbanIcon,
  DollarCircleIcon,
  Analytics01Icon,
  Money02Icon,
  LockIcon,
  BarChartIcon,
  Activity01Icon,
} from "@hugeicons/core-free-icons";
import { KpiWidget } from "@/src/components/dashboard/KpiWidget";
import { WidgetCard } from "@/src/components/dashboard/WidgetCard";
import { EmptyState } from "@/src/components/dashboard/EmptyState";
import { formatCurrency } from "@/src/lib/format";
import type { DashboardData, DataKey } from "@/src/lib/dashboardData";

export type WidgetSize = "sm" | "md" | "lg";

export interface WidgetDefinition {
  id: string;
  label: string;
  category: string;
  icon: any;
  size: WidgetSize;
  dataKeys: DataKey[];
  render: (data: DashboardData) => React.ReactNode;
}

function shortDate(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "dd MMM", { locale: es });
}

function ListRow({ dotColor, title, subtitle, right }: { dotColor: string; title: string; subtitle?: string; right?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle last:border-b-0">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
      </div>
      {right && <span className="text-xs text-text-secondary shrink-0">{right}</span>}
    </div>
  );
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: "contacts_total",
    label: "Contactos totales",
    category: "Contactos",
    icon: UserMultipleIcon,
    size: "sm",
    dataKeys: ["contactsCount"],
    render: (d) => (
      <KpiWidget icon={UserMultipleIcon} iconBg="#E1F0FF" iconColor="#337EA9" value={String(d.contactsCount ?? 0)} label="Leads registrados" href="/contacts" />
    ),
  },
  {
    id: "contacts_new",
    label: "Leads nuevos del mes",
    category: "Contactos",
    icon: UserMultipleIcon,
    size: "sm",
    dataKeys: ["newContactsCount"],
    render: (d) => (
      <KpiWidget icon={UserMultipleIcon} iconBg="#E1F0FF" iconColor="#337EA9" value={String(d.newContactsCount ?? 0)} label="Leads nuevos (mes)" href="/contacts" />
    ),
  },
  {
    id: "appointments_upcoming",
    label: "Citas próximas (KPI)",
    category: "Citas",
    icon: CalendarCheckIn01Icon,
    size: "sm",
    dataKeys: ["upcomingAppointmentsCount"],
    render: (d) => (
      <KpiWidget icon={CalendarCheckIn01Icon} iconBg="#F0E6F9" iconColor="#9065B0" value={String(d.upcomingAppointmentsCount ?? 0)} label="Próximas citas" href="/appointments" />
    ),
  },
  {
    id: "tasks_pending",
    label: "Tareas pendientes (KPI)",
    category: "Tareas",
    icon: Task01Icon,
    size: "sm",
    dataKeys: ["pendingTasksCount"],
    render: (d) => (
      <KpiWidget icon={Task01Icon} iconBg="#FFECD2" iconColor="#D9730D" value={String(d.pendingTasksCount ?? 0)} label="Pendientes" href="/tasks" />
    ),
  },
  {
    id: "campaigns_active",
    label: "Campañas activas",
    category: "Campañas",
    icon: Mail01Icon,
    size: "sm",
    dataKeys: ["campaignsCount"],
    render: (d) => (
      <KpiWidget icon={Mail01Icon} iconBg="#FFE2E2" iconColor="#D44020" value={String(d.campaignsCount ?? 0)} label="Activas" href="/campaigns" />
    ),
  },
  {
    id: "projects_active",
    label: "Proyectos en progreso",
    category: "Proyectos",
    icon: FolderKanbanIcon,
    size: "sm",
    dataKeys: ["projectsCount"],
    render: (d) => (
      <KpiWidget icon={FolderKanbanIcon} iconBg="#E2F6E9" iconColor="#448361" value={String(d.projectsCount ?? 0)} label="En progreso" href="/projects" />
    ),
  },
  {
    id: "pipeline_value",
    label: "Pipeline activo",
    category: "Ventas",
    icon: DollarCircleIcon,
    size: "sm",
    dataKeys: ["pipelineValue"],
    render: (d) => (
      <KpiWidget icon={DollarCircleIcon} iconBg="#E1F0FF" iconColor="#337EA9" value={formatCurrency(d.pipelineValue ?? 0)} label="Pipeline activo" href="/pipeline" />
    ),
  },
  {
    id: "closing_rate",
    label: "Tasa de cierre",
    category: "Ventas",
    icon: Analytics01Icon,
    size: "sm",
    dataKeys: ["dealStats"],
    render: (d) => (
      <KpiWidget icon={Analytics01Icon} iconBg="#E2F6E9" iconColor="#448361" value={`${d.dealStats?.closingRate ?? 0}%`} label="Tasa de cierre" href="/pipeline" />
    ),
  },
  {
    id: "revenue_month",
    label: "Ingreso del mes",
    category: "Ventas",
    icon: DollarCircleIcon,
    size: "sm",
    dataKeys: ["revenueThisMonth"],
    render: (d) => (
      <KpiWidget icon={DollarCircleIcon} iconBg="#F0E6F9" iconColor="#9065B0" value={formatCurrency(d.revenueThisMonth ?? 0)} label="Ingreso este mes" href="/pipeline" />
    ),
  },
  {
    id: "payments_pending",
    label: "Pagos por cobrar",
    category: "Pagos",
    icon: Money02Icon,
    size: "sm",
    dataKeys: ["pendingPaymentsValue"],
    render: (d) => (
      <KpiWidget icon={Money02Icon} iconBg="#FFECD2" iconColor="#D9730D" value={formatCurrency(d.pendingPaymentsValue ?? 0)} label="Pagos por cobrar" href="/pipeline" />
    ),
  },
  {
    id: "followups_overdue",
    label: "Follow-ups vencidos (KPI)",
    category: "Ventas",
    icon: CalendarCheckIn01Icon,
    size: "sm",
    dataKeys: ["followUpDeals"],
    render: (d) => {
      const count = d.followUpDeals?.length ?? 0;
      return (
        <KpiWidget
          icon={CalendarCheckIn01Icon}
          iconBg={count > 0 ? "#FFE2E2" : "#F7F7F5"}
          iconColor={count > 0 ? "#D44020" : "#787774"}
          value={String(count)}
          label="Follow-ups vencidos"
          href="/pipeline"
          highlight={count > 0}
        />
      );
    },
  },
  {
    id: "vault_clients",
    label: "Clientes en bóveda",
    category: "Bóveda",
    icon: LockIcon,
    size: "sm",
    dataKeys: ["vaultClientsCount"],
    render: (d) => (
      <KpiWidget icon={LockIcon} iconBg="#E2F6E9" iconColor="#448361" value={String(d.vaultClientsCount ?? 0)} label="Clientes activos" href="/boveda" />
    ),
  },
  {
    id: "latest_leads_widget",
    label: "Últimos leads (lista)",
    category: "Contactos",
    icon: UserMultipleIcon,
    size: "md",
    dataKeys: ["latestContacts"],
    render: (d) => {
      const contacts = d.latestContacts ?? [];
      return (
        <WidgetCard title="Últimos leads" href="/contacts">
          {contacts.length > 0 ? (
            contacts.map((c) => (
              <ListRow key={c.id} dotColor="#4ade80" title={`${c.firstName} ${c.lastName ?? ""}`} subtitle={c.email ?? "—"} right={shortDate(new Date(c.createdAt))} />
            ))
          ) : (
            <EmptyState icon={UserMultipleIcon} message="No hay contactos registrados" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "upcoming_appointments_widget",
    label: "Próximas citas (lista)",
    category: "Citas",
    icon: Calendar01Icon,
    size: "md",
    dataKeys: ["upcomingAppointments"],
    render: (d) => {
      const appts = d.upcomingAppointments ?? [];
      return (
        <WidgetCard title="Próximas citas" href="/appointments">
          {appts.length > 0 ? (
            appts.map((a) => (
              <ListRow key={a.id} dotColor={a.appointmentType.color} title={a.guestName} subtitle={a.appointmentType.name} right={shortDate(new Date(a.startTime))} />
            ))
          ) : (
            <EmptyState icon={Calendar01Icon} message="No hay citas próximas" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "pending_tasks_widget",
    label: "Tareas pendientes (lista)",
    category: "Tareas",
    icon: Task01Icon,
    size: "md",
    dataKeys: ["pendingTasks"],
    render: (d) => {
      const tasks = d.pendingTasks ?? [];
      return (
        <WidgetCard title="Tareas pendientes" href="/tasks">
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <ListRow
                key={t.id}
                dotColor="#fb923c"
                title={t.title}
                right={t.dueDate ? formatDistanceToNow(new Date(t.dueDate), { addSuffix: true, locale: es }) : "—"}
              />
            ))
          ) : (
            <EmptyState icon={Task01Icon} message="No hay tareas pendientes" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "deals_by_stage",
    label: "Deals por etapa",
    category: "Ventas",
    icon: BarChartIcon,
    size: "md",
    dataKeys: ["dealsByStage"],
    render: (d) => {
      const stages = d.dealsByStage ?? [];
      const maxValue = Math.max(1, ...stages.map((s) => s.value));
      return (
        <WidgetCard title="Deals por etapa" href="/pipeline">
          {stages.length > 0 ? (
            <div className="px-5 py-4 flex flex-col gap-3">
              {stages.map((s) => (
                <div key={s.stageId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary">{s.name} ({s.count})</span>
                    <span className="text-xs text-text-secondary tabular-nums">{formatCurrency(s.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-sidebar overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.value / maxValue) * 100}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BarChartIcon} message="No hay etapas configuradas" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "latest_campaigns_widget",
    label: "Últimas campañas (lista)",
    category: "Campañas",
    icon: Mail01Icon,
    size: "md",
    dataKeys: ["latestCampaigns"],
    render: (d) => {
      const campaigns = d.latestCampaigns ?? [];
      return (
        <WidgetCard title="Últimas campañas" href="/campaigns">
          {campaigns.length > 0 ? (
            campaigns.map((c) => (
              <ListRow key={c.id} dotColor="#f87171" title={c.subject} subtitle={c.status} right={shortDate(new Date(c.createdAt))} />
            ))
          ) : (
            <EmptyState icon={Mail01Icon} message="No hay campañas creadas" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "recent_projects_widget",
    label: "Proyectos recientes (lista)",
    category: "Proyectos",
    icon: FolderKanbanIcon,
    size: "md",
    dataKeys: ["recentProjects"],
    render: (d) => {
      const projects = d.recentProjects ?? [];
      return (
        <WidgetCard title="Proyectos recientes" href="/projects">
          {projects.length > 0 ? (
            projects.map((p) => (
              <ListRow key={p.id} dotColor="#34d399" title={p.name} subtitle={p.description ?? undefined} right={shortDate(new Date(p.createdAt))} />
            ))
          ) : (
            <EmptyState icon={FolderKanbanIcon} message="No hay proyectos creados" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "recent_payments_widget",
    label: "Pagos recientes (lista)",
    category: "Pagos",
    icon: Money02Icon,
    size: "md",
    dataKeys: ["recentPayments"],
    render: (d) => {
      const payments = d.recentPayments ?? [];
      return (
        <WidgetCard title="Pagos recientes" href="/pipeline">
          {payments.length > 0 ? (
            payments.map((p) => (
              <ListRow
                key={p.id}
                dotColor={p.status === "RECIBIDO" ? "#4ade80" : "#fb923c"}
                title={p.label}
                subtitle={p.status}
                right={formatCurrency(p.amount)}
              />
            ))
          ) : (
            <EmptyState icon={Money02Icon} message="No hay pagos registrados" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "followups_overdue_list",
    label: "Follow-ups vencidos (lista)",
    category: "Ventas",
    icon: CalendarCheckIn01Icon,
    size: "md",
    dataKeys: ["followUpDeals"],
    render: (d) => {
      const deals = d.followUpDeals ?? [];
      return (
        <WidgetCard title="Follow-ups vencidos" href="/pipeline">
          {deals.length > 0 ? (
            deals.map((f) => (
              <ListRow
                key={f.id}
                dotColor="#f87171"
                title={f.title}
                subtitle={f.contact ? `${f.contact.firstName} ${f.contact.lastName ?? ""}` : undefined}
                right={new Date(f.followUpAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
              />
            ))
          ) : (
            <EmptyState icon={CalendarCheckIn01Icon} message="No hay follow-ups vencidos" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "recent_activity",
    label: "Actividad reciente",
    category: "Ventas",
    icon: Activity01Icon,
    size: "lg",
    dataKeys: ["recentActivity"],
    render: (d) => {
      const activity = d.recentActivity ?? [];
      return (
        <WidgetCard title="Actividad reciente" href="/pipeline">
          {activity.length > 0 ? (
            activity.map((a) => (
              <ListRow
                key={a.id}
                dotColor="#60a5fa"
                title={a.description}
                subtitle={`${a.deal?.title ?? ""}${a.createdBy?.name ? ` · ${a.createdBy.name}` : ""}`}
                right={formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: es })}
              />
            ))
          ) : (
            <EmptyState icon={Activity01Icon} message="No hay actividad reciente" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "client_mrr",
    label: "Ingreso recurrente mensual (MRR)",
    category: "Pagos",
    icon: Money02Icon,
    size: "sm",
    dataKeys: ["clientPaymentStats"],
    render: (d) => (
      <KpiWidget icon={Money02Icon} iconBg="#E2F6E9" iconColor="#448361" value={formatCurrency(d.clientPaymentStats?.mrr ?? 0)} label="MRR clientes" href="/pipeline/clientes" />
    ),
  },
  {
    id: "client_payments_pending",
    label: "Clientes con pago pendiente",
    category: "Pagos",
    icon: Money02Icon,
    size: "sm",
    dataKeys: ["clientPaymentStats"],
    render: (d) => {
      const count = d.clientPaymentStats?.pendingCount ?? 0;
      return (
        <KpiWidget
          icon={Money02Icon}
          iconBg={count > 0 ? "#FFECD2" : "#F7F7F5"}
          iconColor={count > 0 ? "#D9730D" : "#787774"}
          value={String(count)}
          label="Clientes con pago pendiente"
          href="/pipeline/clientes"
          highlight={count > 0}
        />
      );
    },
  },
  {
    id: "client_payments_list",
    label: "Pagos de clientes (mes actual)",
    category: "Pagos",
    icon: Money02Icon,
    size: "md",
    dataKeys: ["clientPaymentsList"],
    render: (d) => {
      const rows = d.clientPaymentsList ?? [];
      return (
        <WidgetCard title="Pagos de clientes" href="/pipeline/clientes">
          {rows.length > 0 ? (
            rows.map((c) => (
              <ListRow
                key={c.id}
                dotColor={c.isPaid ? "#4ade80" : "#fbbf24"}
                title={c.name}
                subtitle={`Día ${c.billingDay} · ${c.isPaid ? "Pagado" : "Pendiente"}`}
                right={formatCurrency(c.monthlyFee)}
              />
            ))
          ) : (
            <EmptyState icon={Money02Icon} message="No hay clientes recurrentes activos" />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "google_calendar_events",
    label: "Próximos eventos (Google Calendar)",
    category: "Citas",
    icon: Calendar01Icon,
    size: "md",
    dataKeys: ["googleCalendar"],
    render: (d) => {
      const cal = d.googleCalendar;
      const events = cal?.events ?? [];
      return (
        <WidgetCard title="Próximos eventos" href="/settings">
          {!cal?.connected ? (
            <EmptyState icon={Calendar01Icon} message="Conecta tu Google Calendar en Ajustes para ver tus próximos eventos" />
          ) : events.length > 0 ? (
            events.map((e) => (
              <ListRow
                key={e.id}
                dotColor="#60a5fa"
                title={e.summary}
                subtitle={e.location ?? undefined}
                right={`${shortDate(new Date(e.start))} ${format(new Date(e.start), "h:mm a", { locale: es })}`}
              />
            ))
          ) : (
            <EmptyState icon={Calendar01Icon} message="No hay eventos próximos" />
          )}
        </WidgetCard>
      );
    },
  },
];

export const WIDGET_MAP: Record<string, WidgetDefinition> = Object.fromEntries(WIDGET_REGISTRY.map((w) => [w.id, w]));

export const DEFAULT_WIDGETS: string[] = [
  "contacts_total",
  "appointments_upcoming",
  "tasks_pending",
  "campaigns_active",
  "projects_active",
  "pipeline_value",
  "closing_rate",
  "revenue_month",
  "followups_overdue",
  "google_calendar_events",
  "client_mrr",
  "client_payments_pending",
  "followups_overdue_list",
  "client_payments_list",
];

export function widgetSizeClass(size: WidgetSize) {
  switch (size) {
    case "sm":
      return "col-span-1";
    case "md":
      return "col-span-2";
    case "lg":
      return "col-span-2 md:col-span-4";
  }
}
