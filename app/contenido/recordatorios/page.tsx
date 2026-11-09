import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { Block, Chip, DataList, EmptyState, Enter, PageHeader } from "@/src/components/ui";
import { contentTypeLabel } from "@/src/lib/content-client-colors";

const TIME_ZONE = "America/Cancun";

const pad = (n: number) => String(n).padStart(2, "0");
const hourLabel = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;
const daysLabel = (days: number) => (days === 0 ? "el mismo día" : days === 1 ? "1 día antes" : `${days} días antes`);

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
      select: { id: true, name: true, color: true, reminderHour: true, reminderMinute: true, reminderDaysBefore: true, _count: { select: { phones: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { organizationId, reminderEnabled: true, notifiedAt: null, date: { gte: today } },
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
                <Link href={`/contenido/${item.clientId}`} className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
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
        <Block title="Horario por cliente" action={{ label: "Ver clientes", href: "/contenido/clientes" }}>
          <DataList
            label="Horario de avisos por cliente"
            rows={clients}
            getKey={(client) => client.id}
            empty={<EmptyState title="Aún no hay clientes de contenido" />}
            renderRow={(client) => (
              <Link href={`/contenido/${client.id}`} className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: client.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{client.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                  {hourLabel(client.reminderHour, client.reminderMinute)} · {daysLabel(client.reminderDaysBefore)}
                  {client._count.phones === 0 ? " · sin teléfono" : ""}
                </span>
              </Link>
            )}
          />
        </Block>
      </Enter>
    </main>
  );
}
