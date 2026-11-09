import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { Block, DataList, EmptyState, Enter, PageHeader } from "@/src/components/ui";
import { KpiWidget } from "@/src/components/dashboard/KpiWidget";
import { ContentPieceRow } from "@/src/components/content/ContentPieceRow";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Calendar03Icon, CheckmarkCircle02Icon, Megaphone01Icon, PencilEdit02Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { contentGreeting, summarizeContent } from "@/src/lib/content-dashboard";

const TIME_ZONE = "America/Cancun";

export default async function ContenidoResumenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) redirect("/login");

  const now = new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const kicker = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(now);

  const [clients, items] = await Promise.all([
    prisma.contentClient.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    prisma.contentItem.findMany({
      where: { organizationId, publishStatus: { not: "subido" } },
      select: { id: true, title: true, type: true, publishStatus: true, date: true, time: true, clientId: true, client: { select: { name: true } } },
      orderBy: { date: "asc" },
      take: 800,
    }),
  ]);

  const summary = summarizeContent(
    items.map((item) => ({ id: item.id, title: item.title, type: item.type, publishStatus: item.publishStatus, date: item.date, time: item.time, clientId: item.clientId, clientName: item.client.name })),
    clients,
    todayKey,
  );
  const colorOf = new Map(clients.map((client) => [client.id, client.color]));
  const { counts } = summary;
  // Misma paleta de círculos que el Inicio: índigo, naranja, verde, morado y rojo.
  const tone = {
    indigo: { iconBg: "#EBEDFA", iconColor: "#3545D6" },
    orange: { iconBg: "#FFECD2", iconColor: "#D9730D" },
    green: { iconBg: "#E2F6E9", iconColor: "#448361" },
    purple: { iconBg: "#F0E6F9", iconColor: "#9065B0" },
    red: { iconBg: "#FFE2E2", iconColor: "#D44020" },
  } as const;

  return (
    <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden lg:gap-5 overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Contenido"
          denseOnMobile
          leading={
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)] sm:size-14">
              <HugeiconsIcon icon={Megaphone01Icon} size={24} />
            </span>
          }
          subtitle={
            <span className="block min-h-[2.75em]">
              <span className="block text-xs font-medium capitalize text-text-secondary">{kicker}</span>
              <span className="block text-sm text-text-primary">{contentGreeting(summary)}</span>
            </span>
          }
        />
      </Enter>

      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          <KpiWidget icon={Calendar03Icon} {...tone.indigo} value={String(counts.today)} label="Para hoy" href="/contenido/general" />
          <KpiWidget icon={Alert02Icon} {...tone.red} value={String(counts.overdue)} label="Atrasadas" href="/contenido/general" highlight={counts.overdue > 0} />
          <KpiWidget icon={Upload01Icon} {...tone.green} value={String(counts.toUpload)} label="Listas para subir" href="/contenido/general" />
          <KpiWidget icon={PencilEdit02Icon} {...tone.orange} value={String(counts.inEditing)} label="En edición" href="/contenido/general" />
          <KpiWidget icon={CheckmarkCircle02Icon} {...tone.purple} value={String(counts.pending)} label="Pendientes" href="/contenido/general" />
          <KpiWidget icon={Megaphone01Icon} {...tone.indigo} value={String(counts.thisWeek)} label="Próximos 7 días" href="/contenido/general" />
        </div>
      </Enter>

      <Enter index={2}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Block title="Hoy" action={{ label: "Ver calendario", href: "/contenido/general" }}>
            <DataList
              label="Piezas de hoy"
              rows={summary.today}
              getKey={(item) => item.id}
              empty={<EmptyState title="Nada programado para hoy" />}
              renderRow={(item) => <ContentPieceRow item={item} color={colorOf.get(item.clientId)} />}
            />
          </Block>
          <Block title="Atrasadas" action={{ label: "Ver calendario", href: "/contenido/general" }}>
            <DataList
              label="Piezas atrasadas"
              rows={summary.overdue.slice(0, 8)}
              getKey={(item) => item.id}
              empty={<EmptyState title="Sin piezas atrasadas" />}
              renderRow={(item) => <ContentPieceRow item={item} color={colorOf.get(item.clientId)} showDate late />}
            />
          </Block>
        </div>
      </Enter>

      <Enter index={3}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Block title="Próximos 7 días">
            <DataList
              label="Piezas de la semana"
              rows={summary.upcoming.slice(0, 8)}
              getKey={(item) => item.id}
              empty={<EmptyState title="Sin piezas en los próximos días" />}
              renderRow={(item) => <ContentPieceRow item={item} color={colorOf.get(item.clientId)} showDate />}
            />
          </Block>
          <Block title="Salud por cliente" action={{ label: "Ver clientes", href: "/contenido/clientes" }}>
            <DataList
              label="Clientes"
              rows={summary.perClient}
              getKey={(client) => client.id}
              empty={<EmptyState title="Aún no hay clientes de contenido" body="Crea un cliente o marca para empezar a planear su calendario." />}
              renderRow={(client) => (
                <Link href={`/contenido/general?cliente=${client.id}`} className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: client.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{client.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                    {client.idle
                      ? "Sin contenido programado"
                      : [client.overdue > 0 ? `${client.overdue} atrasada${client.overdue === 1 ? "" : "s"}` : null, client.today > 0 ? `${client.today} hoy` : null, `${client.total} abiertas`].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              )}
            />
          </Block>
        </div>
      </Enter>
    </main>
  );
}
