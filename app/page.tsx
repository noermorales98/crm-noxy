import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { DashboardShortcuts } from "@/src/components/DashboardShortcuts";
import { DashboardWidgets } from "@/src/components/DashboardWidgets";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    redirect("/login");
  }

  const organizationId = session.currentOrganizationId;

  const [upcomingAppointments, latestContacts, pendingTasks, contactsCount, campaignsCount, projectsCount] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { organizationId, startTime: { gte: new Date() } },
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
    ]);

  const pendingTasksCount = await prisma.task.count({
    where: { organizationId, isCompleted: false },
  });

  const upcomingAppointmentsCount = await prisma.appointment.count({
    where: { organizationId, startTime: { gte: new Date() } },
  });

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <DashboardShortcuts
            contactsCount={contactsCount}
            appointmentsCount={upcomingAppointmentsCount}
            tasksCount={pendingTasksCount}
            campaignsCount={campaignsCount}
            projectsCount={projectsCount}
          />
          <DashboardWidgets
            appointments={upcomingAppointments}
            contacts={latestContacts}
            tasks={pendingTasks}
          />
        </main>
      </div>
    </div>
  );
}
