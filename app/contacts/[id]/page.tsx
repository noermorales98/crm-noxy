import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { visibleContactWhere } from "@/src/lib/visible-contacts";
import { summarizeContact } from "@/src/lib/record-summary";
import ContactDetail from "@/src/components/detail/ContactDetail";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) redirect("/login");
  const organizationId = session.currentOrganizationId;

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId, AND: [visibleContactWhere] },
    include: {
      company: { select: { id: true, name: true } },
      sourceForm: { select: { id: true, name: true } },
      deals: {
        orderBy: { updatedAt: "desc" },
        take: 25,
        select: { id: true, title: true, value: true, currency: true, isArchived: true, updatedAt: true, stage: { select: { name: true, isWon: true, isLost: true } } },
      },
      quotes: { orderBy: { issuedAt: "desc" }, take: 25, select: { id: true, folio: true, status: true, total: true, currency: true, issuedAt: true } },
      clients: { select: { id: true, name: true, monthlyFee: true, currency: true, isActive: true } },
      appointments: {
        orderBy: { startTime: "desc" },
        take: 15,
        select: { id: true, title: true, startTime: true, status: true, appointmentType: { select: { name: true } } },
      },
      tasks: { where: { isCompleted: false }, orderBy: { dueDate: "asc" }, take: 15, select: { id: true, title: true, dueDate: true } },
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, status: true, sentAt: true, createdAt: true, campaign: { select: { subject: true } } },
      },
    },
  });
  if (!contact) notFound();

  const summary = summarizeContact({
    deals: contact.deals,
    quotes: contact.quotes,
    appointments: contact.appointments,
  });

  return <ContactDetail contact={JSON.parse(JSON.stringify(contact))} summary={JSON.parse(JSON.stringify(summary))} />;
}
