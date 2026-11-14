"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CallIcon, Mail01Icon, Message01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Block, Chip, DataList, DealIconBadge, EmptyState, type ChipTone } from "@/src/components/ui";
import { PropertiesCard, RecordShell } from "@/src/components/detail/RecordShell";
import { formatMoney } from "@/src/lib/quote-format";
import { ManualAppointmentDialog } from "@/src/components/ManualAppointmentDialog";

type Client = {
  id: string;
  name: string;
  monthlyFee: number;
  currency: string;
  startDate: string;
  billingDay: number;
  autoMarkPaid: boolean;
  notes: string | null;
  isActive: boolean;
  contactName: string | null;
  phoneCode: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
  payments: { id: string; amount: number; currency: string; status: string; month: number; year: number; dueDate: string | null; receivedAt: string | null; notes: string | null }[];
};
type Deal = { id: string; title: string; value: number | null; currency: string; updatedAt: string; stage: { name: string; isWon: boolean; isLost: boolean } };
type Quote = { id: string; folio: string; status: string; total: number; currency: string; issuedAt: string };
type Summary = { count: number; received: number; pending: number; late: number };
type Referral = { id: string; title: string; value: number | null; currency: string; stage: { name: string; isWon: boolean; isLost: boolean } };
type ProjectRow = { id: string; name: string; createdAt: string };
type TaskRow = { id: string; title: string; dueDate: string | null };
type Appointment = { id: string; title: string | null; startTime: string; status: string; appointmentType: { name: string } | null };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const PAYMENT_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", RECIBIDO: "Recibido", CANCELADO: "Cancelado" };
const PAYMENT_TONE: Record<string, ChipTone> = { RECIBIDO: "done", PENDIENTE: "hot", CANCELADO: "neutral" };
const QUOTE_LABEL: Record<string, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", PARCIAL: "Pago parcial", PAGADA: "Pagada", VENCIDA: "Vencida", RECHAZADA: "Rechazada" };
const QUOTE_TONE: Record<string, ChipTone> = { ACEPTADA: "done", PAGADA: "done", PARCIAL: "hot", VENCIDA: "late", RECHAZADA: "late" };

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha";
const ROW_LINK = "flex min-w-0 flex-1 items-center gap-3 text-left";

export default function ClientDetail({ client, deals, quotes, appointments, summary, referrals = [], projects = [], tasks = [] }: { client: Client; deals: Deal[]; quotes: Quote[]; appointments: Appointment[]; summary: Summary; referrals?: Referral[]; projects?: ProjectRow[]; tasks?: TaskRow[] }) {
  const router = useRouter();
  const [showAppointment, setShowAppointment] = useState(false);
  const now = new Date();
  const phone = client.phone ? `${client.phoneCode ?? ""}${client.phone}`.replace(/[\s\-().]/g, "") : "";
  const quickActions = [
    ...(phone ? [
      { href: `tel:${phone}`, label: "Llamar", icon: CallIcon },
      { href: `sms:${phone}`, label: "Enviar SMS", icon: Message01Icon },
      { href: `https://wa.me/${phone.replace(/^\+/, "")}`, label: "Enviar WhatsApp", icon: WhatsappIcon, external: true },
    ] : []),
    ...(client.email ? [{ href: `mailto:${client.email}`, label: "Enviar correo", icon: Mail01Icon }] : []),
  ];
  const isLate = (payment: Client["payments"][number]) => payment.status === "PENDIENTE" && payment.dueDate !== null && new Date(payment.dueDate) < now;

  return (
    <>
    <RecordShell
      backHref="/pipeline/clientes"
      crumb="Clientes"
      title={client.name}
      leading={<DealIconBadge icon="briefcase" />}
      subtitle={`${formatMoney(client.monthlyFee, client.currency)} al mes · cobro el día ${client.billingDay}`}
      badges={
        <>
          <Chip tone={client.isActive ? "done" : "neutral"}>{client.isActive ? "Activo" : "Inactivo"}</Chip>
          {summary.late > 0 && <Chip tone="late">{summary.late} {summary.late === 1 ? "pago atrasado" : "pagos atrasados"}</Chip>}
        </>
      }
      quickActions={quickActions}
      stats={[
        { label: "Mensualidad", value: formatMoney(client.monthlyFee, client.currency) },
        { label: "Cobrado", value: formatMoney(summary.received, client.currency) },
        { label: "Por cobrar", value: formatMoney(summary.pending, client.currency), flag: summary.late > 0 ? `${summary.late} atrasado${summary.late === 1 ? "" : "s"}` : undefined },
        { label: "Pagos registrados", value: summary.count },
        { label: "Referidos que trajo", value: referrals.length, flag: referrals.some((r) => r.stage.isWon) ? `${referrals.filter((r) => r.stage.isWon).length} ganado${referrals.filter((r) => r.stage.isWon).length === 1 ? "" : "s"}` : undefined },
      ]}
      main={
        <>
          <Block title="Pagos">
            <DataList
              label="Pagos del cliente"
              rows={client.payments}
              getKey={(payment) => payment.id}
              empty={<EmptyState title="Sin pagos registrados" body="Los pagos mensuales de este cliente se generan desde Clientes y aparecen aquí." />}
              renderRow={(payment) => (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{MONTHS[payment.month - 1] ?? payment.month} {payment.year}</span>
                    <span className="block text-xs text-text-secondary">
                      {payment.receivedAt ? `Recibido el ${day(payment.receivedAt)}` : payment.dueDate ? `Vence el ${day(payment.dueDate)}` : "Sin fecha de vencimiento"}
                    </span>
                  </span>
                  {isLate(payment) ? <Chip tone="late">Vencido</Chip> : <Chip tone={PAYMENT_TONE[payment.status] ?? "neutral"}>{PAYMENT_LABEL[payment.status] ?? payment.status}</Chip>}
                  <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(payment.amount, payment.currency || client.currency)}</span>
                </>
              )}
            />
          </Block>

          <Block title="Referidos que trajo">
            <DataList
              label="Leads referidos por este cliente"
              rows={referrals}
              getKey={(deal) => deal.id}
              empty={<EmptyState title="Sin referidos registrados" body="En un lead, elige a este cliente en «Referido por» y aparecerá aquí." />}
              renderRow={(deal) => (
                <Link href={`/pipeline/${deal.id}`} className={ROW_LINK}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{deal.title}</span>
                    <span className="block text-xs text-text-secondary">{deal.stage.name}</span>
                  </span>
                  {deal.stage.isWon && <Chip tone="done">Ganado</Chip>}
                  {deal.stage.isLost && <Chip tone="late">Perdido</Chip>}
                  <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(deal.value ?? 0, deal.currency)}</span>
                </Link>
              )}
            />
          </Block>

          <Block title="Proyectos" action={{ label: "Ver proyectos", href: "/projects" }}>
            <DataList
              label="Proyectos del cliente"
              rows={projects}
              getKey={(project) => project.id}
              empty={<EmptyState title="Sin proyectos" body="Se crean solos al ganar un lead, o a mano desde Proyectos." />}
              renderRow={(project) => (
                <Link href={`/projects/${project.id}`} className={ROW_LINK}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{project.name}</span>
                    <span className="block text-xs text-text-secondary">Creado el {day(project.createdAt)}</span>
                  </span>
                </Link>
              )}
            />
          </Block>

          <Block title="Tareas abiertas" action={{ label: "Ver tareas", href: "/tasks" }}>
            <DataList
              label="Tareas abiertas del cliente"
              rows={tasks}
              getKey={(task) => task.id}
              empty={<EmptyState title="Sin tareas abiertas" body="Las tareas de sus proyectos y de su contacto aparecen aquí." />}
              renderRow={(task) => (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{task.title}</span>
                  <span className="shrink-0 text-xs text-text-secondary">{task.dueDate ? day(task.dueDate) : "Sin fecha"}</span>
                </>
              )}
            />
          </Block>

          <Block title="Citas" action={{ label: "Nueva cita", onClick: () => setShowAppointment(true) }}>
            <DataList
              label="Citas del cliente"
              rows={appointments}
              getKey={(appointment) => appointment.id}
              empty={<EmptyState title="Sin citas" body="Crea una con «Nueva cita»; las citas de este cliente se listan aquí." />}
              renderRow={(appointment) => (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{appointment.title?.trim() || appointment.appointmentType?.name || "Cita"}</span>
                    <span className="block text-xs text-text-secondary">
                      {new Date(appointment.startTime).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <Chip tone={appointment.status === "CANCELLED" ? "late" : "neutral"}>{appointment.status === "CANCELLED" ? "Cancelada" : appointment.status === "COMPLETED" ? "Completada" : "Confirmada"}</Chip>
                </>
              )}
            />
          </Block>

          {client.contact && (
            <>
              <Block title="Leads del contacto" action={{ label: "Ver contacto", href: `/contacts/${client.contact.id}` }}>
                <DataList
                  label="Leads del contacto"
                  rows={deals}
                  getKey={(deal) => deal.id}
                  empty={<EmptyState title="Sin leads" body="El contacto de este cliente no tiene leads en el pipeline." />}
                  renderRow={(deal) => (
                    <Link href={`/pipeline/${deal.id}`} className={ROW_LINK}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{deal.title}</span>
                        <span className="block text-xs text-text-secondary">{deal.stage.name} · {day(deal.updatedAt)}</span>
                      </span>
                      {deal.stage.isWon && <Chip tone="done">Ganado</Chip>}
                      {deal.stage.isLost && <Chip tone="late">Perdido</Chip>}
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(deal.value ?? 0, deal.currency)}</span>
                    </Link>
                  )}
                />
              </Block>

              <Block title="Cotizaciones del contacto" action={{ label: "Ver todas", href: "/cotizaciones" }}>
                <DataList
                  label="Cotizaciones del contacto"
                  rows={quotes}
                  getKey={(quote) => quote.id}
                  empty={<EmptyState title="Sin cotizaciones" body="Las cotizaciones ligadas al contacto de este cliente aparecerán aquí." />}
                  renderRow={(quote) => (
                    <Link href={`/cotizaciones/${quote.folio}`} className={ROW_LINK}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{quote.folio}</span>
                        <span className="block text-xs text-text-secondary">{day(quote.issuedAt)}</span>
                      </span>
                      <Chip tone={QUOTE_TONE[quote.status] ?? "neutral"}>{QUOTE_LABEL[quote.status] ?? quote.status}</Chip>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(quote.total, quote.currency)}</span>
                    </Link>
                  )}
                />
              </Block>
            </>
          )}
        </>
      }
      side={
        <>
          <PropertiesCard
            rows={[
              { label: "Estado", value: client.isActive ? "Activo" : "Inactivo" },
              { label: "Mensualidad", value: <span className="font-semibold tabular-nums">{formatMoney(client.monthlyFee, client.currency)}</span> },
              { label: "Día de cobro", value: `Día ${client.billingDay} de cada mes` },
              { label: "Cobro automático", value: client.autoMarkPaid ? "Marca los pagos como recibidos" : "Desactivado" },
              { label: "Inicio", value: day(client.startDate) },
              { label: "Contacto", value: client.contact ? <Link href={`/contacts/${client.contact.id}`} className="truncate hover:underline">{[client.contact.firstName, client.contact.lastName].filter(Boolean).join(" ")}</Link> : client.contactName || "Sin contacto" },
              { label: "Correo", value: client.email ? <a href={`mailto:${client.email}`} className="truncate hover:underline">{client.email}</a> : "Sin correo" },
              { label: "Teléfono", value: client.phone ? <a href={`tel:${phone}`} className="tabular-nums hover:underline">{[client.phoneCode, client.phone].filter(Boolean).join(" ")}</a> : "Sin teléfono" },
              { label: "Empresa", value: client.company ? <Link href="/companies" className="truncate hover:underline">{client.company.name}</Link> : "Sin empresa" },
            ]}
          />
          {client.notes && (
            <section aria-label="Notas" className="rounded-surface border border-line bg-surface-elevated">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text-primary">Notas</h2>
              <p className="whitespace-pre-wrap px-4 py-3 text-sm text-text-secondary">{client.notes}</p>
            </section>
          )}
          <Link href="/pipeline/clientes" className="inline-flex h-9 items-center justify-center rounded-control border border-line text-sm font-medium text-text-secondary hover:bg-nav-hover hover:text-text-primary">
            Editar o registrar pagos en Clientes
          </Link>
        </>
      }
    />
    <ManualAppointmentDialog
      open={showAppointment}
      onClose={() => setShowAppointment(false)}
      prefill={{
        clientId: client.id,
        contactId: client.contact?.id ?? null,
        guestName: client.contactName || client.name,
        guestEmail: client.email ?? "",
        guestPhone: phone,
      }}
      onCreated={() => router.refresh()}
    />
    </>
  );
}
