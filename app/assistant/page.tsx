import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) redirect("/");

  await prisma.aiConversation.deleteMany({
    where: {
      userId: session.user.id!,
      organizationId: orgId,
      messages: { none: {} },
    },
  });

  const latest = await prisma.aiConversation.findFirst({
    where: {
      userId: session.user.id!,
      organizationId: orgId,
      messages: { some: {} },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest) {
    redirect(`/assistant/${latest.id}`);
  }

  redirect("/assistant/new");
}
