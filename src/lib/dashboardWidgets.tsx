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
  Building04Icon,
  Invoice01Icon,
  MegaphoneIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { KpiWidget } from "@/src/components/dashboard/KpiWidget";
import { WidgetCard } from "@/src/components/dashboard/WidgetCard";
import { DetailTrigger, type RowDetail } from "@/src/components/dashboard/DetailDialog";
import { DataList, EmptyState } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/format";
import { contentTypeLabel } from "@/src/lib/content-client-colors";
import { publishStatusColor, publishStatusLabel } from "@/src/lib/content-publish";
import type { ContentPieceRow, DashboardData, DataKey, LostDealRow, QuoteRow } from "@/src/lib/dashboardData";
import type { Money } from "@/src/lib/deal-sales";

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

const fmtMoney = (amount: number, currency: string) => `$${amount.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${currency}`;

/** «$1,200 MXN · $300 USD»: cada moneda aparte, nunca sumadas entre sí. */
function moneyText(money: Money | undefined) {
  const parts = Object.entries(money ?? {}).filter(([, amount]) => amount !== 0);
  return parts.length ? parts.map(([currency, amount]) => fmtMoney(amount, currency)).join(" · ") : "$0";
}

const longDate = (date: Date) => format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
const longDateTime = (date: Date) => format(date, "EEEE d 'de' MMMM, h:mm a", { locale: es });
const fullName = (c: { firstName: string; lastName?: string | null }) => `${c.firstName} ${c.lastName ?? ""}`.trim();

const QUOTE_STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", PARCIAL: "Pago parcial", PAGADA: "Pagada", VENCIDA: "Vencida", RECHAZADA: "Rechazada",
};

function quoteDetail(q: QuoteRow): RowDetail {
  return {
    title: q.folio,
    subtitle: `${q.clientName}${q.clientCompany ? ` · ${q.clientCompany}` : ""}`,
    fields: [
      { label: "Estado", value: QUOTE_STATUS_LABEL[q.status] ?? q.status },
      { label: "Total", value: fmtMoney(q.total, q.currency) },
      { label: "Saldo por cobrar", value: q.balance != null ? fmtMoney(q.balance, q.currency) : null },
      { label: "Deal conectado", value: q.dealTitle ?? (q.status === "PAGADA" ? "Ninguno: esta venta no sale en el historial hasta conectarla" : "Ninguno") },
      { label: "Válida hasta", value: q.validUntil ? longDate(new Date(q.validUntil)) : null },
    ],
    href: `/cotizaciones/${q.folio}`,
    hrefLabel: "Abrir cotización",
  };
}

function lostDealDetail(d: LostDealRow): RowDetail {
  return {
    title: d.title,
    subtitle: d.contactName ?? undefined,
    fields: [
      { label: "Motivo de la pérdida", value: d.lostReason ?? "Sin motivo guardado (perdido antes de pedirlo)" },
      { label: "Se perdió", value: d.lostAt ? longDate(new Date(d.lostAt)) : null },
      { label: "Valor", value: d.value != null ? fmtMoney(d.value, d.currency) : null },
    ],
    href: `/pipeline/${d.id}`,
    hrefLabel: "Abrir deal",
  };
}

function contentDetail(item: ContentPieceRow): RowDetail {
  const day = new Date(item.date);
  return {
    title: item.title || "Sin título",
    subtitle: item.clientName,
    fields: [
      { label: "Tipo", value: contentTypeLabel(item.type) },
      { label: "Estado", value: publishStatusLabel(item.publishStatus) },
      { label: "Día", value: longDate(new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())) },
      { label: "Hora", value: item.time },
      { label: "Gancho", value: item.hook },
      { label: "Nota del equipo", value: item.note },
    ],
    href: "/contenido/general",
    hrefLabel: "Abrir calendario",
  };
}

function contentDayLabel(iso: string) {
  const date = new Date(iso);
  return shortDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ContentPieceRows({ items, empty }: { items: ContentPieceRow[]; empty: string }) {
  return (
    <DataList
      rows={items}
      getKey={(item) => item.id}
      empty={<EmptyState title={empty} />}
      renderRow={(item) => (
    <ListRow
      dotColor={publishStatusColor(item.publishStatus)}
      title={item.title || "Sin título"}
      subtitle={`${item.clientName} · ${contentTypeLabel(item.type)} · ${publishStatusLabel(item.publishStatus)}`}
      right={item.time ? `${contentDayLabel(item.date)} ${item.time}` : contentDayLabel(item.date)}
      detail={contentDetail(item)}
    />
      )}
    />
  );
}

function ListRow({ dotColor, title, subtitle, right, detail }: { dotColor: string; title: string; subtitle?: string; right?: string; detail?: RowDetail }) {
  const content = (
    <>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{title}</p>
        {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
      </div>
      {right && <span className="text-xs text-text-secondary shrink-0">{right}</span>}
    </>
  );
  if (detail) return <DetailTrigger detail={detail}>{content}</DetailTrigger>;
  return <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>;
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
      <KpiWidget icon={UserMultipleIcon} iconBg="#EBEDFA" iconColor="#3545D6" value={String(d.contactsCount ?? 0)} label="Leads registrados" href="/contacts" />
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
      <KpiWidget icon={UserMultipleIcon} iconBg="#EBEDFA" iconColor="#3545D6" value={String(d.newContactsCount ?? 0)} label="Leads nuevos (mes)" href="/contacts" />
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
    dataKeys: ["pipelineByCurrency"],
    render: (d) => (
      <KpiWidget icon={DollarCircleIcon} iconBg="#EBEDFA" iconColor="#3545D6" value={moneyText(d.pipelineByCurrency)} label="Pipeline activo" href="/pipeline" />
    ),
  },
  {
    id: "closing_rate",
    label: "Tasa de cierre",
    category: "Ventas",
    icon: Analytics01Icon,
    size: "sm",
    dataKeys: ["monthSales"],
    render: (d) => (
      <KpiWidget icon={Analytics01Icon} iconBg="#E2F6E9" iconColor="#448361" value={d.monthSales?.closingRate == null ? "—" : `${d.monthSales.closingRate}%`} label="Tasa de cierre (mes)" href="/pipeline/historial" />
    ),
  },
  {
    id: "revenue_month",
    label: "Ingreso del mes",
    category: "Ventas",
    icon: DollarCircleIcon,
    size: "sm",
    dataKeys: ["monthSales"],
    render: (d) => (
      <KpiWidget icon={DollarCircleIcon} iconBg="#F0E6F9" iconColor="#9065B0" value={moneyText(d.monthSales?.paymentsReceived)} label="Cobros recibidos (mes)" href="/pipeline/historial" />
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
          iconColor={count > 0 ? "#D44020" : "#6B7184"}
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
          <DataList rows={contacts} getKey={(c) => c.id} renderRow={(c) => <ListRow dotColor="#4ade80" title={`${c.firstName} ${c.lastName ?? ""}`} subtitle={c.email ?? "Sin email"} right={shortDate(new Date(c.createdAt))} detail={{ title: fullName(c), subtitle: c.email ?? undefined, fields: [{ label: "Correo", value: c.email }, { label: "Teléfono", value: c.phone }, { label: "Origen", value: c.source }, { label: "Registrado", value: longDate(new Date(c.createdAt)) }], href: `/contacts/${c.id}`, hrefLabel: "Abrir contacto" }} />} empty={<EmptyState title="No hay contactos registrados" />} />
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
          <DataList rows={appts} getKey={(a) => a.id} renderRow={(a) => <ListRow dotColor={a.appointmentType?.color ?? "#6B7184"} title={a.guestName} subtitle={a.title?.trim() || a.appointmentType?.name || "Cita"} right={shortDate(new Date(a.startTime))} detail={{ title: a.title?.trim() || a.appointmentType?.name || "Cita", subtitle: a.guestName, fields: [{ label: "Cuándo", value: `${longDateTime(new Date(a.startTime))} – ${format(new Date(a.endTime), "h:mm a", { locale: es })}` }, { label: "Tipo de cita", value: a.appointmentType?.name }, { label: "Correo", value: a.guestEmail }, { label: "Teléfono", value: a.guestPhone }, { label: "Estado", value: a.status === "CONFIRMED" ? "Confirmada" : a.status }, { label: "Notas", value: a.notes }], href: `/appointments/${a.id}`, hrefLabel: "Abrir cita" }} />} empty={<EmptyState title="No hay citas próximas" />} />
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
          <DataList rows={tasks} getKey={(t) => t.id} renderRow={(t) => <ListRow
                dotColor="#fb923c"
                title={t.title}
                right={t.dueDate ? formatDistanceToNow(new Date(t.dueDate), { addSuffix: true, locale: es }) : "Sin fecha"}
                detail={{ title: t.title, fields: [{ label: "Fecha límite", value: t.dueDate ? longDate(new Date(t.dueDate)) : "Sin fecha" }, { label: "Asignada a", value: t.assignedTo?.name }, { label: "Descripción", value: t.description }], href: "/tasks", hrefLabel: "Abrir tareas" }}
              />} empty={<EmptyState title="No hay tareas pendientes" />} />
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
            <EmptyState title="No hay etapas configuradas" />
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
          <DataList rows={campaigns} getKey={(c) => c.id} renderRow={(c) => <ListRow dotColor="#f87171" title={c.subject} subtitle={c.status} right={shortDate(new Date(c.createdAt))} detail={{ title: c.subject, fields: [{ label: "Estado", value: c.status }, { label: "Creada", value: longDate(new Date(c.createdAt)) }], href: "/campaigns", hrefLabel: "Abrir campañas" }} />} empty={<EmptyState title="No hay campañas creadas" />} />
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
          <DataList rows={projects} getKey={(p) => p.id} renderRow={(p) => <ListRow dotColor="#34d399" title={p.name} subtitle={p.description ?? undefined} right={shortDate(new Date(p.createdAt))} detail={{ title: p.name, fields: [{ label: "Descripción", value: p.description }, { label: "Creado", value: longDate(new Date(p.createdAt)) }], href: `/projects/${p.id}`, hrefLabel: "Abrir proyecto" }} />} empty={<EmptyState title="No hay proyectos creados" />} />
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
          <DataList rows={payments} getKey={(p) => p.id} renderRow={(p) => <ListRow
                dotColor={p.status === "RECIBIDO" ? "#4ade80" : "#fb923c"}
                title={p.label}
                subtitle={p.status}
                right={fmtMoney(p.amount, p.currency)}
                detail={{ title: p.label, subtitle: p.source === "client" ? "Cliente recurrente" : "Pago de un deal", fields: [{ label: "Monto", value: fmtMoney(p.amount, p.currency) }, { label: "Estado", value: p.status === "RECIBIDO" ? "Recibido" : "Pendiente" }, { label: "Registrado", value: longDate(new Date(p.createdAt)) }, { label: "Recibido", value: p.receivedAt ? longDate(new Date(p.receivedAt)) : null }], href: p.source === "client" ? "/pipeline/clientes" : "/pipeline", hrefLabel: "Abrir pipeline" }}
              />} empty={<EmptyState title="No hay pagos registrados" />} />
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
          <DataList rows={deals} getKey={(f) => f.id} renderRow={(f) => <ListRow
                dotColor="#f87171"
                title={f.title}
                subtitle={f.contact ? `${f.contact.firstName} ${f.contact.lastName ?? ""}` : undefined}
                right={new Date(f.followUpAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                detail={{ title: f.title, subtitle: f.contact ? fullName(f.contact) : undefined, fields: [{ label: "Seguimiento pendiente desde", value: longDate(new Date(f.followUpAt)) }], href: `/pipeline/${f.id}`, hrefLabel: "Abrir deal" }}
              />} empty={<EmptyState title="No hay follow-ups vencidos" />} />
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
          <DataList rows={activity} getKey={(a) => a.id} renderRow={(a) => <ListRow
                dotColor="#60a5fa"
                title={a.description}
                subtitle={`${a.deal?.title ?? ""}${a.createdBy?.name ? ` · ${a.createdBy.name}` : ""}`}
                right={formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: es })}
                detail={{ title: a.description, subtitle: a.deal?.title, fields: [{ label: "Hecho por", value: a.createdBy?.name }, { label: "Cuándo", value: longDateTime(new Date(a.createdAt)) }], href: "/pipeline", hrefLabel: "Abrir pipeline" }}
              />} empty={<EmptyState title="No hay actividad reciente" />} />
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
          iconColor={count > 0 ? "#D9730D" : "#6B7184"}
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
          <DataList rows={rows} getKey={(c) => c.id} renderRow={(c) => <ListRow
                dotColor={c.isPaid ? "#4ade80" : "#fbbf24"}
                title={c.name}
                subtitle={`Día ${c.billingDay} · ${c.isPaid ? "Pagado" : "Pendiente"}`}
                right={formatCurrency(c.monthlyFee)}
                detail={{ title: c.name, subtitle: c.isPaid ? "Pagado este mes" : "Pago pendiente este mes", fields: [{ label: "Mensualidad", value: fmtMoney(c.monthlyFee, c.currency) }, { label: "Día de cobro", value: `Día ${c.billingDay} de cada mes` }, { label: "Recibido", value: c.receivedAt ? longDate(new Date(c.receivedAt)) : null }], href: "/pipeline/clientes", hrefLabel: "Abrir clientes" }}
              />} empty={<EmptyState title="No hay clientes recurrentes activos" />} />
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
        <WidgetCard title="Próximos eventos" href="/appointments">
          {!cal?.connected ? (
            <EmptyState title="Conecta tu Google Calendar en Ajustes para ver tus próximos eventos" />
          ) : (
            <DataList
              rows={events}
              getKey={(e) => e.id}
              renderRow={(e) => (
                <ListRow
                  dotColor="#60a5fa"
                  title={e.summary}
                  subtitle={e.location ?? undefined}
                  right={`${shortDate(new Date(e.start))} ${format(new Date(e.start), "h:mm a", { locale: es })}`}
                  detail={{
                    title: e.summary,
                    fields: [
                      { label: "Cuándo", value: `${longDateTime(new Date(e.start))} – ${format(new Date(e.end), "h:mm a", { locale: es })}` },
                      { label: "Lugar", value: e.location },
                      { label: "Descripción", value: e.description },
                    ],
                    href: "/appointments",
                    hrefLabel: "Abrir citas",
                    external: e.htmlLink ? { href: e.htmlLink, label: "Abrir en Google Calendar" } : undefined,
                  }}
                />
              )}
              empty={<EmptyState title="No hay eventos próximos" />}
            />
          )}
        </WidgetCard>
      );
    },
  },
  {
    id: "companies_total",
    label: "Empresas",
    category: "Empresas",
    icon: Building04Icon,
    size: "sm",
    dataKeys: ["companiesCount"],
    render: (d) => (
      <KpiWidget icon={Building04Icon} iconBg="#EBEDFA" iconColor="#3545D6" value={String(d.companiesCount ?? 0)} label="Empresas" href="/companies" />
    ),
  },
  {
    id: "open_quotes",
    label: "Cotizaciones abiertas",
    category: "Cotizaciones",
    icon: Invoice01Icon,
    size: "sm",
    dataKeys: ["openQuotesCount"],
    render: (d) => (
      <KpiWidget icon={Invoice01Icon} iconBg="#FFECD2" iconColor="#D9730D" value={String(d.openQuotesCount ?? 0)} label="Cotizaciones abiertas" href="/cotizaciones" />
    ),
  },
  {
    id: "content_calendars_active",
    label: "Calendarios activos",
    category: "Calendarios",
    icon: MegaphoneIcon,
    size: "sm",
    dataKeys: ["contentCalendarsCount"],
    render: (d) => (
      <KpiWidget icon={MegaphoneIcon} iconBg="#EBEDFA" iconColor="#3545D6" value={String(d.contentCalendarsCount ?? 0)} label="Calendarios activos" href="/contenido" />
    ),
  },
  {
    id: "content_due_today",
    label: "Piezas de hoy",
    category: "Calendarios",
    icon: Calendar01Icon,
    size: "sm",
    dataKeys: ["contentDueTodayCount"],
    render: (d) => (
      <KpiWidget icon={Calendar01Icon} iconBg="#F0E6F9" iconColor="#9065B0" value={String(d.contentDueTodayCount ?? 0)} label="Piezas de hoy" href="/contenido/general" />
    ),
  },
  {
    id: "content_pending_month",
    label: "Pendientes del mes",
    category: "Calendarios",
    icon: CalendarCheckIn01Icon,
    size: "sm",
    dataKeys: ["contentPendingMonthCount"],
    render: (d) => (
      <KpiWidget icon={CalendarCheckIn01Icon} iconBg="#FFECD2" iconColor="#D9730D" value={String(d.contentPendingMonthCount ?? 0)} label="Pendientes del mes" href="/contenido/general" />
    ),
  },
  {
    id: "content_upcoming",
    label: "Próximas piezas",
    category: "Calendarios",
    icon: Calendar01Icon,
    size: "md",
    dataKeys: ["contentUpcoming"],
    render: (d) => (
      <WidgetCard title="Próximas piezas" href="/contenido/general">
        <ContentPieceRows items={d.contentUpcoming ?? []} empty="No hay piezas en los próximos 7 días" />
      </WidgetCard>
    ),
  },
  {
    id: "content_in_editing",
    label: "En edición",
    category: "Calendarios",
    icon: MegaphoneIcon,
    size: "md",
    dataKeys: ["contentInEditing"],
    render: (d) => (
      <WidgetCard title="En edición" href="/contenido/general">
        <ContentPieceRows items={d.contentInEditing ?? []} empty="No hay piezas en edición" />
      </WidgetCard>
    ),
  },
  {
    id: "sales_won_month",
    label: "Ventas ganadas del mes",
    category: "Ventas",
    icon: CheckmarkCircle01Icon,
    size: "sm",
    dataKeys: ["monthSales"],
    render: (d) => {
      const sales = d.monthSales;
      const inProgress = sales?.inProgress.count ?? 0;
      return (
        <KpiWidget
          icon={CheckmarkCircle01Icon}
          iconBg="#E2F6E9"
          iconColor="#448361"
          value={String(sales?.won.count ?? 0)}
          label={inProgress > 0 ? `Ventas ganadas (${inProgress} a mitad de proceso)` : "Ventas ganadas (mes)"}
          href="/pipeline/historial"
        />
      );
    },
  },
  {
    id: "sales_lost_month",
    label: "Perdidos del mes",
    category: "Ventas",
    icon: Cancel01Icon,
    size: "sm",
    dataKeys: ["monthSales"],
    render: (d) => (
      <KpiWidget icon={Cancel01Icon} iconBg="#FFE2E2" iconColor="#D44020" value={String(d.monthSales?.lost.count ?? 0)} label="Perdidos (mes)" href="/pipeline/historial" />
    ),
  },
  {
    id: "sales_month_summary",
    label: "Cierre del mes",
    category: "Ventas",
    icon: Analytics01Icon,
    size: "md",
    dataKeys: ["monthSales"],
    render: (d) => {
      const sales = d.monthSales;
      const [year, month] = (sales?.month ?? "").split("-").map(Number);
      const monthName = year ? format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: es }) : "este mes";
      const rows: { label: string; value: string }[] = [
        { label: "Ventas ganadas", value: `${sales?.won.count ?? 0} · ${moneyText(sales?.won.byCurrency)}` },
        { label: "Perdidos", value: String(sales?.lost.count ?? 0) },
        { label: "Tasa de cierre", value: sales?.closingRate == null ? "Sin cierres" : `${sales.closingRate}%` },
        { label: "Cobros recibidos", value: moneyText(sales?.paymentsReceived) },
      ];
      const pending = sales?.inProgress.count ?? 0;
      return (
        <WidgetCard title={`Cierre de ${monthName}`} href="/pipeline/historial">
          <dl className="flex flex-col divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
                <dt className="text-xs font-semibold text-text-secondary">{row.label}</dt>
                <dd className="min-w-0 text-right text-sm font-medium tabular-nums text-text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line px-4 py-2.5 text-xs text-text-secondary sm:px-5">
            {pending > 0
              ? `${pending === 1 ? "1 venta ganada sigue" : `${pending} ventas ganadas siguen`} a mitad de proceso (${moneyText(sales?.inProgress.byCurrency)}): ya cuenta${pending === 1 ? "" : "n"}, pero aún falta cobrar o terminar.`
              : "Mes en curso: las cifras se actualizan en vivo."}
          </p>
        </WidgetCard>
      );
    },
  },
  {
    id: "sales_in_progress",
    label: "Ventas a mitad de proceso",
    category: "Ventas",
    icon: Clock01Icon,
    size: "md",
    dataKeys: ["monthSales"],
    render: (d) => {
      const deals = d.monthSales?.inProgress.deals ?? [];
      return (
        <WidgetCard title="Ventas a mitad de proceso" href="/pipeline/historial">
          <DataList
            rows={deals}
            getKey={(deal) => deal.id}
            renderRow={(deal) => (
              <ListRow
                dotColor="#fbbf24"
                title={deal.title}
                subtitle={deal.reason}
                right={fmtMoney(deal.amount, deal.currency)}
                detail={{ title: deal.title, subtitle: "Venta ganada que aún no termina", fields: [{ label: "Monto", value: fmtMoney(deal.amount, deal.currency) }, { label: "Qué falta", value: deal.reason }], href: `/pipeline/${deal.id}`, hrefLabel: "Abrir deal" }}
              />
            )}
            empty={<EmptyState title="Ninguna venta del mes está a medias" />}
          />
        </WidgetCard>
      );
    },
  },
  {
    id: "lost_reasons_list",
    label: "Deals perdidos y su motivo",
    category: "Ventas",
    icon: Cancel01Icon,
    size: "md",
    dataKeys: ["lostDealsRecent"],
    render: (d) => (
      <WidgetCard title="Perdidos recientes" href="/pipeline/historial">
        <DataList
          rows={d.lostDealsRecent ?? []}
          getKey={(deal) => deal.id}
          renderRow={(deal) => (
            <ListRow
              dotColor="#f87171"
              title={deal.title}
              subtitle={deal.lostReason ?? "Sin motivo guardado"}
              right={deal.lostAt ? shortDate(new Date(deal.lostAt)) : undefined}
              detail={lostDealDetail(deal)}
            />
          )}
          empty={<EmptyState title="No hay deals perdidos" />}
        />
      </WidgetCard>
    ),
  },
  {
    id: "quotes_unlinked_paid",
    label: "Cotizaciones pagadas sin deal",
    category: "Cotizaciones",
    icon: File01Icon,
    size: "sm",
    dataKeys: ["unlinkedPaidQuotes"],
    render: (d) => {
      const count = d.unlinkedPaidQuotes?.count ?? 0;
      return (
        <KpiWidget
          icon={File01Icon}
          iconBg={count > 0 ? "#FFECD2" : "#E2F6E9"}
          iconColor={count > 0 ? "#D9730D" : "#448361"}
          value={String(count)}
          label="Pagadas sin deal (no salen en el historial)"
          href="/cotizaciones"
          highlight={count > 0}
        />
      );
    },
  },
  {
    id: "quotes_unlinked_paid_list",
    label: "Cotizaciones pagadas por conectar (lista)",
    category: "Cotizaciones",
    icon: File01Icon,
    size: "md",
    dataKeys: ["unlinkedPaidQuotes"],
    render: (d) => (
      <WidgetCard title="Pagadas sin deal" href="/cotizaciones">
        <DataList
          rows={d.unlinkedPaidQuotes?.rows ?? []}
          getKey={(q) => q.id}
          renderRow={(q) => <ListRow dotColor="#fb923c" title={q.folio} subtitle={`${q.clientName} · conéctala a un deal`} right={fmtMoney(q.total, q.currency)} detail={quoteDetail(q)} />}
          empty={<EmptyState title="Todas las cotizaciones pagadas ya tienen deal" />}
        />
      </WidgetCard>
    ),
  },
  {
    id: "quotes_balance_due",
    label: "Saldos por cobrar (cotizaciones)",
    category: "Cotizaciones",
    icon: Money02Icon,
    size: "md",
    dataKeys: ["partialQuotes"],
    render: (d) => (
      <WidgetCard title="Saldos por cobrar" href="/cotizaciones">
        <DataList
          rows={d.partialQuotes ?? []}
          getKey={(q) => q.id}
          renderRow={(q) => (
            <ListRow
              dotColor="#fbbf24"
              title={q.folio}
              subtitle={`${q.clientName} · anticipo pagado`}
              right={q.balance != null ? fmtMoney(q.balance, q.currency) : fmtMoney(q.total, q.currency)}
              detail={quoteDetail(q)}
            />
          )}
          empty={<EmptyState title="No hay saldos pendientes en cotizaciones" />}
        />
      </WidgetCard>
    ),
  },
  {
    id: "open_quotes_list",
    label: "Cotizaciones abiertas (lista)",
    category: "Cotizaciones",
    icon: Invoice01Icon,
    size: "md",
    dataKeys: ["openQuotesList"],
    render: (d) => (
      <WidgetCard title="Cotizaciones abiertas" href="/cotizaciones">
        <DataList
          rows={d.openQuotesList ?? []}
          getKey={(q) => q.id}
          renderRow={(q) => (
            <ListRow
              dotColor="#60a5fa"
              title={q.folio}
              subtitle={`${q.clientName} · ${QUOTE_STATUS_LABEL[q.status] ?? q.status}`}
              right={fmtMoney(q.total, q.currency)}
              detail={quoteDetail(q)}
            />
          )}
          empty={<EmptyState title="No hay cotizaciones abiertas" />}
        />
      </WidgetCard>
    ),
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
      return "col-span-2 xl:col-span-4";
  }
}
