import { DashboardShortcuts } from "@/src/components/DashboardShortcuts";
import { DashboardWidgets } from "@/src/components/DashboardWidgets";
import { SalesMetrics } from "@/src/components/SalesMetrics";
import { FollowUpWidget } from "@/src/components/FollowUpWidget";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    redirect("/login");
  }

  const organizationId = session.currentOrganizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    upcomingAppointments,
    latestContacts,
    pendingTasks,
    contactsCount,
    campaignsCount,
    projectsCount,
    pendingTasksCount,
    upcomingAppointmentsCount,
    wonDeals,
    totalDeals,
    pipelineDeals,
    revenuePayments,
    followUpDeals,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId, startTime: { gte: now } },
      include: { appointmentType: true },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { organizationId, isCompleted: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.contact.count({ where: { organizationId } }),
    prisma.emailCampaign.count({ where: { organizationId } }),
    prisma.project.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId, isCompleted: false } }),
    prisma.appointment.count({ where: { organizationId, startTime: { gte: now } } }),
    // Won deals this month
    prisma.deal.count({
      where: {
        organizationId,
        stage: { isWon: true },
        updatedAt: { gte: startOfMonth },
      },
    }),
    // Total closed deals this month (won + lost)
    prisma.deal.count({
      where: {
        organizationId,
        stage: { OR: [{ isWon: true }, { isLost: true }] },
        updatedAt: { gte: startOfMonth },
      },
    }),
    // Active pipeline deals (not won/lost)
    prisma.deal.findMany({
      where: {
        organizationId,
        stage: { isWon: false, isLost: false },
      },
      select: { value: true, id: true },
    }),
    // Revenue received this month
    prisma.payment.findMany({
      where: {
        organizationId,
        status: "RECIBIDO",
        receivedAt: { gte: startOfMonth },
      },
      select: { amount: true },
    }),
    // Overdue follow-ups
    prisma.deal.findMany({
      where: {
        organizationId,
        followUpAt: { lt: now },
        stage: { isWon: false, isLost: false },
      },
      select: {
        id: true,
        title: true,
        followUpAt: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { followUpAt: "asc" },
    }),
  ]);

  const pipelineValue = pipelineDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const revenueThisMonth = revenuePayments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const closingRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
  const followUpsDue = followUpDeals.length;

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 flex flex-col gap-5 bg-surface-app">
          <DashboardShortcuts
            contactsCount={contactsCount}
            appointmentsCount={upcomingAppointmentsCount}
            tasksCount={pendingTasksCount}
            campaignsCount={campaignsCount}
            projectsCount={projectsCount}
          />
          <SalesMetrics
            pipelineValue={pipelineValue}
            closingRate={closingRate}
            revenueThisMonth={revenueThisMonth}
            followUpsDue={followUpsDue}
          />
          {followUpsDue > 0 && (
            <FollowUpWidget followUps={followUpDeals as any} />
          )}
          <DashboardWidgets
            appointments={upcomingAppointments}
            contacts={latestContacts}
            tasks={pendingTasks}
          />
        </main>
  );
}
