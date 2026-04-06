import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
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
      payments: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!deal) notFound();

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <DealDetailClient deal={JSON.parse(JSON.stringify(deal))} />
      </div>
    </div>
  );
}
