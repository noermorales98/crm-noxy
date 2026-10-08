import { prisma } from "@/src/lib/db";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const deal = await prisma.deal.findUnique({
    where: { bookingToken: token },
    select: { title: true },
  });
  const name = deal?.title?.trim();
  return shareMetadata({
    title: name ? `Cita — ${name}` : "Cita",
    description: name ? `Agenda una cita para ${name}.` : "Enlace para agendar una cita.",
    path: `/book/${token}`,
  });
}

export default function PublicBookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
