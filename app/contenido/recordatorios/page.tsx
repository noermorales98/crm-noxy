import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { Block, Chip, DataList, EmptyState, Enter, PageHeader } from "@/src/components/ui";
import { pieceHref } from "@/src/components/content/ContentPieceRow";
import { contentTypeLabel } from "@/src/lib/content-client-colors";
import ReminderClientsPanel from "@/src/components/content/ReminderClientsPanel";

const TIME_ZONE = "America/Cancun";

const pad = (n: number) => String(n).padStart(2, "0");
const hourLabel = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

/** Día en que sale el aviso: la fecha de la pieza menos los días de anticipación. */
function notifyDay(date: Date, daysBefore: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  return d;
}

export default async function ContentRemindersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) redirect("/login");

  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  const [clients, scheduled] = await Promise.all([
    prisma.contentClient.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, color: true, remindersEnabled: true, reminderHour: true, reminderMinute: true, reminderDaysBefore: true, _count: { select: { phones: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { organizationId, reminderEnabled: true, notifiedAt: null, date: { gte: today }, client: { remindersEnabled: true } },
      select: { id: true, title: true, type: true, date: true, reminderDaysBefore: true, clientId: true, client: { select: { name: true, color: true, reminderHour: true, reminderMinute: true } } },
      orderBy: { date: "asc" },
      take: 100,
    }),
  ]);

  return (
    <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader title="Recordatorios" subtitle="Avisos por WhatsApp de grabación y publicación: cuáles están programados y a qué hora salen." />
      </Enter>

      <Enter index={1}>
        <Block title="Avisos programados">
          <DataList
            label="Avisos programados"
            rows={scheduled}
            getKey={(item) => item.id}
            empty={<EmptyState title="Sin avisos programados" body="Activa el recordatorio en una pieza desde el calendario del cliente para que aparezca aquí." />}
            renderRow={(item) => {
              const sendDay = notifyDay(item.date, item.reminderDaysBefore);
              return (
                <Link href={pieceHref(item)} className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.client.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{item.title || "Sin título"}</span>
                    <span className="block truncate text-xs text-text-secondary">
                      {item.client.name} · {contentTypeLabel(item.type)} · pieza del {item.date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" })}
                    </span>
                  </span>
                  <Chip>
                    {`Aviso ${sendDay.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" })} · ${hourLabel(item.client.reminderHour, item.client.reminderMinute)}`}
                  </Chip>
                </Link>
              );
            }}
          />
        </Block>
      </Enter>

      <Enter index={2}>
        <Block title="Avisos por cliente" action={{ label: "Ver clientes", href: "/contenido/clientes" }}>
          {clients.length === 0 ? (
            <EmptyState title="Aún no hay clientes de contenido" />
          ) : (
            <ReminderClientsPanel
              clients={clients.map((client) => ({
                id: client.id,
                name: client.name,
                color: client.color,
                remindersEnabled: client.remindersEnabled,
                reminderHour: client.reminderHour,
                reminderMinute: client.reminderMinute,
                reminderDaysBefore: client.reminderDaysBefore,
                phones: client._count.phones,
                scheduled: scheduled.filter((item) => item.clientId === client.id).length,
              }))}
            />
          )}
        </Block>
      </Enter>
    </main>
  );
}
