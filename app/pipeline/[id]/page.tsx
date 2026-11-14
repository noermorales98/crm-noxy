import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import DealDetailClient from "@/src/components/DealDetailClient";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    redirect("/login");
  }
  const organizationId = session.currentOrganizationId;

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId },
    include: {
      stage: {
        include: {
          pipeline: {
            include: {
              stages: { orderBy: { order: "asc" } },
            },
          },
        },
      },
      contact: true,
      referredByClient: { select: { id: true, name: true } },
      referredByContact: { select: { id: true, firstName: true, lastName: true } },
      organization: {
        include: {
          companies: { select: { id: true, name: true }, take: 50 },
          contacts: { select: { id: true, firstName: true, lastName: true }, take: 50 },
        },
      },
      activities: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      proposals: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, folio: true, status: true, total: true, currency: true, issuedAt: true, validUntil: true },
      },
      payments: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
      appointments: {
        include: { appointmentType: { select: { id: true, name: true, duration: true, color: true } } },
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!deal) notFound();

  const referrerClients = await prisma.client.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <DealDetailClient deal={JSON.parse(JSON.stringify({ ...deal, referrerClients }))} />
  );
}
