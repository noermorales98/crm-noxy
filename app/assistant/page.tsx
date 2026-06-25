import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  // Find the most recent conversation
  const latest = await prisma.aiConversation.findFirst({
    where: { userId: session.user.id!, organizationId: orgId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest) {
    redirect(`/assistant/${latest.id}`);
  }

  // Create first conversation
  const newConv = await prisma.aiConversation.create({
    data: { userId: session.user.id!, organizationId: orgId },
    select: { id: true },
  });

  redirect(`/assistant/${newConv.id}`);
}
