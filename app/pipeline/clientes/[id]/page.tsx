import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { summarizeClientPayments } from "@/src/lib/record-summary";
import ClientDetail from "@/src/components/detail/ClientDetail";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) redirect("/login");
  const organizationId = session.currentOrganizationId;

  // La bóveda de credenciales no se incluye: esta ficha no la muestra.
  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    select: {
      id: true, name: true, monthlyFee: true, currency: true, startDate: true, billingDay: true, autoMarkPaid: true,
      notes: true, isActive: true, contactName: true, phoneCode: true, phone: true, email: true, createdAt: true,
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      payments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { id: true, amount: true, currency: true, status: true, month: true, year: true, dueDate: true, receivedAt: true, notes: true },
      },
    },
  });
  if (!client) notFound();

  const related = client.contact
    ? await Promise.all([
        prisma.deal.findMany({
          where: { organizationId, contactId: client.contact.id },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, title: true, value: true, currency: true, updatedAt: true, stage: { select: { name: true, isWon: true, isLost: true } } },
        }),
        prisma.quote.findMany({
          where: { organizationId, contactId: client.contact.id },
          orderBy: { issuedAt: "desc" },
          take: 10,
          select: { id: true, folio: true, status: true, total: true, currency: true, issuedAt: true },
        }),
      ])
    : [[], []];

  // Citas del cliente: las ligadas a su contacto o hechas con su mismo correo.
  const appointmentMatch = [
    ...(client.contact ? [{ contactId: client.contact.id }] : []),
    ...(client.email ? [{ guestEmail: client.email }] : []),
  ];
  const appointments = appointmentMatch.length
    ? await prisma.appointment.findMany({
        where: { organizationId, OR: appointmentMatch },
        orderBy: { startTime: "desc" },
        take: 15,
        select: { id: true, title: true, startTime: true, status: true, appointmentType: { select: { name: true } } },
      })
    : [];

  // Perfil unificado: referidos que trajo, proyectos y tareas abiertas.
  const [referrals, projects, tasks] = await Promise.all([
    prisma.deal.findMany({
      where: { organizationId, referredByClientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true, isWon: true, isLost: true } } },
    }),
    prisma.project.findMany({
      where: { organizationId, clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: {
        organizationId,
        isCompleted: false,
        OR: [{ project: { clientId: client.id } }, ...(client.contact ? [{ contactId: client.contact.id }] : [])],
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 10,
      select: { id: true, title: true, dueDate: true },
    }),
  ]);

  const summary = summarizeClientPayments(client.payments);
  return (
    <ClientDetail
      client={JSON.parse(JSON.stringify(client))}
      deals={JSON.parse(JSON.stringify(related[0]))}
      quotes={JSON.parse(JSON.stringify(related[1]))}
      appointments={JSON.parse(JSON.stringify(appointments))}
      referrals={JSON.parse(JSON.stringify(referrals))}
      projects={JSON.parse(JSON.stringify(projects))}
      tasks={JSON.parse(JSON.stringify(tasks))}
      summary={summary}
    />
  );
}
