"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CallIcon, Mail01Icon, Message01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Block, Chip, DataList, DealIconBadge, EmptyState, type ChipTone } from "@/src/components/ui";
import { PropertiesCard, RecordShell } from "@/src/components/detail/RecordShell";
import { formatByCurrency, type Money } from "@/src/lib/deal-sales";
import { formatMoney } from "@/src/lib/quote-format";
import { ManualAppointmentDialog } from "@/src/components/ManualAppointmentDialog";
import { LinkDealDialog } from "@/src/components/LinkDealDialog";

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string } | null;
  sourceForm: { id: string; name: string } | null;
  deals: { id: string; title: string; value: number | null; currency: string; isArchived: boolean; updatedAt: string; stage: { name: string; isWon: boolean; isLost: boolean } }[];
  quotes: { id: string; folio: string; status: string; total: number; currency: string; issuedAt: string }[];
  clients: { id: string; name: string; monthlyFee: number; currency: string; isActive: boolean }[];
  appointments: { id: string; title: string | null; startTime: string; status: string; appointmentType: { name: string } | null }[];
  tasks: { id: string; title: string; dueDate: string | null }[];
  emailLogs: { id: string; status: string; sentAt: string | null; createdAt: string; campaign: { subject: string } }[];
};

type Summary = { openLeads: number; wonLeads: number; wonByCurrency: Money; quotes: number; paidByCurrency: Money; nextAppointment: string | null };

const QUOTE_LABEL: Record<string, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", PARCIAL: "Pago parcial", PAGADA: "Pagada", VENCIDA: "Vencida", RECHAZADA: "Rechazada" };
const QUOTE_TONE: Record<string, ChipTone> = { ACEPTADA: "done", PAGADA: "done", PARCIAL: "hot", VENCIDA: "late", RECHAZADA: "late" };
const MAIL_LABEL: Record<string, string> = { PENDING: "Pendiente", SENT: "Enviado", FAILED: "Fallido", OPENED: "Abierto" };

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha";
const dayTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const ROW_LINK = "flex min-w-0 flex-1 items-center gap-3 text-left";

export default function ContactDetail({ contact, summary }: { contact: Contact; summary: Summary }) {
  const router = useRouter();
  const [showAppointment, setShowAppointment] = useState(false);
  const [showLinkDeal, setShowLinkDeal] = useState(false);
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const phone = contact.phone?.replace(/[\s\-().]/g, "") ?? "";
  const quickActions = [
    ...(phone ? [
      { href: `tel:${contact.phone}`, label: "Llamar", icon: CallIcon },
      { href: `sms:${contact.phone}`, label: "Enviar SMS", icon: Message01Icon },
      { href: `https://wa.me/${phone.replace(/^\+/, "")}`, label: "Enviar WhatsApp", icon: WhatsappIcon, external: true },
    ] : []),
    ...(contact.email ? [{ href: `mailto:${contact.email}`, label: "Enviar correo", icon: Mail01Icon }] : []),
  ];

  return (
    <>
    <RecordShell
      backHref="/contacts"
      crumb="Contactos"
      title={name}
      leading={<DealIconBadge icon="user" />}
      subtitle={[contact.company?.name, contact.email].filter(Boolean).join(" · ") || "Contacto sin empresa ni correo"}
      badges={summary.wonLeads > 0 ? <Chip tone="done">Cliente: {summary.wonLeads} {summary.wonLeads === 1 ? "venta" : "ventas"}</Chip> : undefined}
      quickActions={quickActions}
      stats={[
        { label: "Leads abiertos", value: summary.openLeads },
        { label: "Ventas ganadas", value: summary.wonLeads, delta: summary.wonLeads ? formatByCurrency(summary.wonByCurrency) : undefined },
        { label: "Cotizaciones", value: summary.quotes, delta: Object.keys(summary.paidByCurrency).length ? `Cobrado ${formatByCurrency(summary.paidByCurrency)}` : undefined },
        { label: "Próxima cita", value: summary.nextAppointment ? day(summary.nextAppointment) : "Sin cita" },
      ]}
      main={
        <>
          <Block title="Leads" action={{ label: "Enlazar lead", onClick: () => setShowLinkDeal(true) }}>
            <DataList
              label="Leads del contacto"
              rows={contact.deals}
              getKey={(deal) => deal.id}
              empty={<EmptyState title="Sin leads" body="Cuando este contacto se vincule a un lead del pipeline aparecerá aquí." />}
              renderRow={(deal) => (
                <Link href={`/pipeline/${deal.id}`} className={ROW_LINK}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{deal.title}</span>
                    <span className="block text-xs text-text-secondary">{deal.stage.name}{deal.isArchived ? " · archivado" : ""} · {day(deal.updatedAt)}</span>
                  </span>
                  {deal.stage.isWon && <Chip tone="done">Ganado</Chip>}
                  {deal.stage.isLost && <Chip tone="late">Perdido</Chip>}
                  <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(deal.value ?? 0, deal.currency)}</span>
                </Link>
              )}
            />
          </Block>

          <Block title="Cotizaciones" action={{ label: "Ver todas", href: "/cotizaciones" }}>
            <DataList
              label="Cotizaciones del contacto"
              rows={contact.quotes}
              getKey={(quote) => quote.id}
              empty={<EmptyState title="Sin cotizaciones" body="Crea una desde un lead o desde Cotizaciones y vincúlala a este contacto." />}
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

          {contact.clients.length > 0 && (
            <Block title="Cliente de mensualidad">
              <DataList
                label="Clientes de facturación"
                rows={contact.clients}
                getKey={(client) => client.id}
                empty={null}
                renderRow={(client) => (
                  <Link href={`/pipeline/clientes/${client.id}`} className={ROW_LINK}>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{client.name}</span>
                    <Chip tone={client.isActive ? "done" : "neutral"}>{client.isActive ? "Activo" : "Inactivo"}</Chip>
                    <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(client.monthlyFee, client.currency)}</span>
                  </Link>
                )}
              />
            </Block>
          )}

          <Block title="Citas" action={{ label: "Nueva cita", onClick: () => setShowAppointment(true) }}>
            <DataList
              label="Citas del contacto"
              rows={contact.appointments}
              getKey={(appointment) => appointment.id}
              empty={<EmptyState title="Sin citas" body="Crea una con «Nueva cita»; las citas de este contacto se listan aquí." />}
              renderRow={(appointment) => (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{appointment.title?.trim() || appointment.appointmentType?.name || "Cita"}</span>
                    <span className="block text-xs text-text-secondary">{dayTime(appointment.startTime)}</span>
                  </span>
                  <Chip tone={appointment.status === "CANCELLED" ? "late" : "neutral"}>{appointment.status === "CANCELLED" ? "Cancelada" : "Confirmada"}</Chip>
                </>
              )}
            />
          </Block>

          <Block title="Tareas pendientes" action={{ label: "Ver tareas", href: "/tasks" }}>
            <DataList
              label="Tareas del contacto"
              rows={contact.tasks}
              getKey={(task) => task.id}
              empty={<EmptyState title="Sin tareas pendientes" body="Las tareas ligadas a este contacto aparecerán aquí." />}
              renderRow={(task) => (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{task.title}</span>
                  <span className="shrink-0 text-xs text-text-secondary">{task.dueDate ? day(task.dueDate) : "Sin fecha"}</span>
                </>
              )}
            />
          </Block>

          {contact.emailLogs.length > 0 && (
            <Block title="Correos de campañas">
              <DataList
                label="Correos enviados al contacto"
                rows={contact.emailLogs}
                getKey={(log) => log.id}
                empty={null}
                renderRow={(log) => (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text-primary">{log.campaign.subject}</span>
                      <span className="block text-xs text-text-secondary">{dayTime(log.sentAt ?? log.createdAt)}</span>
                    </span>
                    <Chip tone={log.status === "FAILED" ? "late" : "neutral"}>{MAIL_LABEL[log.status] ?? log.status}</Chip>
                  </>
                )}
              />
            </Block>
          )}
        </>
      }
      side={
        <PropertiesCard
          rows={[
            { label: "Correo", value: contact.email ? <a href={`mailto:${contact.email}`} className="truncate hover:underline">{contact.email}</a> : "Sin correo" },
            { label: "Teléfono", value: contact.phone ? <a href={`tel:${contact.phone}`} className="tabular-nums hover:underline">{contact.phone}</a> : "Sin teléfono" },
            { label: "Empresa", value: contact.company ? <Link href="/companies" className="truncate hover:underline">{contact.company.name}</Link> : "Sin empresa" },
            { label: "Origen", value: contact.sourceForm ? contact.sourceForm.name : contact.source || "Sin origen" },
            { label: "Creado", value: day(contact.createdAt) },
            { label: "Actualizado", value: day(contact.updatedAt) },
          ]}
        />
      }
    />
    <ManualAppointmentDialog
      open={showAppointment}
      onClose={() => setShowAppointment(false)}
      prefill={{ contactId: contact.id, guestName: name, guestEmail: contact.email ?? "", guestPhone: contact.phone ?? "" }}
      onCreated={() => router.refresh()}
    />
    <LinkDealDialog
      open={showLinkDeal}
      onClose={() => setShowLinkDeal(false)}
      contactId={contact.id}
      contactName={name}
      onLinked={() => router.refresh()}
    />
    </>
  );
}
