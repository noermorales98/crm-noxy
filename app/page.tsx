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

  // Fetch upcoming appointments
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      startTime: { gte: new Date() },
    },
    include: {
      appointmentType: true,
    },
    orderBy: {
      startTime: 'asc',
    },
    take: 5,
  });

  // Fetch latest contacts
  const latestContacts = await prisma.contact.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  // Fetch pending tasks
  const pendingTasks = await prisma.task.findMany({
    where: {
      organizationId,
      isCompleted: false,
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ],
    take: 5,
  });

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6 flex flex-col gap-8">
          <DashboardShortcuts />
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
