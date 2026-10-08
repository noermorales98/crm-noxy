import { prisma } from "@/src/lib/db";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const appointmentType = await prisma.appointmentType.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });
  const name = appointmentType?.name?.trim();
  return shareMetadata({
    title: name ? `Agenda — ${name}` : "Agenda",
    description: appointmentType?.description?.trim() || (name ? `Agenda para ${name}.` : "Agenda una cita."),
    path: `/schedule/${slug}`,
  });
}

export default function PublicScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
