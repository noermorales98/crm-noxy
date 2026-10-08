import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/db";
import PublicCalendarView from "@/src/components/content/PublicCalendarView";
import { calendarMonthLabel, parseMesParam } from "@/src/lib/content-month";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { token } = await params;
  const { mes } = await searchParams;
  const client = await prisma.contentClient.findFirst({
    where: { publicToken: token, isActive: true },
    select: { name: true },
  });
  const parsed = parseMesParam(mes ?? null);
  const now = new Date();
  const cursor = parsed ?? { year: now.getFullYear(), month: now.getMonth() };
  const label = calendarMonthLabel(cursor.year, cursor.month);
  const name = client?.name?.trim();
  const title = name ? `Calendario de ${label} — ${name}` : "Calendario";
  const description = name
    ? `Calendario de contenido de ${name} para ${label}.`
    : "Calendario de contenido.";
  const query = parsed ? `?mes=${mes}` : "";
  return shareMetadata({ title, description, path: `/calendario/${token}${query}` });
}

export default async function PublicCalendarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await prisma.contentClient.findFirst({
    where: { publicToken: token, isActive: true },
    select: { id: true, name: true, kind: true, description: true },
  });
  if (!client) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <PublicCalendarView
        token={token}
        clientName={client.name}
        clientKind={client.kind}
        clientDescription={client.description}
      />
    </Suspense>
  );
}
