import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import ChatView from "./_components/ChatView";

export default async function AssistantConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  const conversation = await prisma.aiConversation.findFirst({
    where: { id, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) notFound();

  if (conversation.messages.length === 0) {
    await prisma.aiConversation.delete({ where: { id } });
    redirect("/assistant/new");
  }

  const messages = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return <ChatView conversationId={conversation.id} initialMessages={messages} />;
}
