import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/db";
import PublicCalendarView from "@/src/components/content/PublicCalendarView";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await prisma.contentClient.findFirst({
    where: { publicToken: token, isActive: true },
    select: { name: true },
  });
  return { title: client ? `Calendario de contenido — ${client.name}` : "Calendario de contenido" };
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
    <PublicCalendarView
      token={token}
      clientName={client.name}
      clientKind={client.kind}
      clientDescription={client.description}
    />
  );
}
