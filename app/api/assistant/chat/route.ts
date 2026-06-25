import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { buildCrmContext } from "@/src/lib/ai-context";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) {
    return new Response(JSON.stringify({ error: "No organization context" }), { status: 400 });
  }

  let conversationId: string, content: string;
  try {
    ({ conversationId, content } = await req.json() as { conversationId: string; content: string });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const trimmed = content?.trim();
  if (!conversationId || !trimmed) {
    return new Response(JSON.stringify({ error: "Missing conversationId or content" }), { status: 400 });
  }

  // Verify ownership
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // Save user message
  await prisma.aiMessage.create({
    data: { conversationId, role: "user", content: trimmed },
  });

  // Auto-title from first message
  if (conversation.messages.length === 0) {
    const title = trimmed.slice(0, 60) + (trimmed.length > 60 ? "…" : "");
    await prisma.aiConversation.update({ where: { id: conversationId }, data: { title } });
  }

  // Build CRM context and inject as system message
  const crmContext = await buildCrmContext(session.user.id!, orgId);

  // Build history for Chatbase (system context + conversation + new user message)
  const history = [
    { role: "system", content: crmContext },
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  // Call Chatbase with streaming
  const chatbaseRes = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHATBASE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: history,
      chatbotId: process.env.CHATBASE_BOT_ID,
      stream: true,
    }),
  });

  if (!chatbaseRes.ok || !chatbaseRes.body) {
    return new Response(JSON.stringify({ error: "Chatbase error" }), { status: 502 });
  }

  // Forward stream to client, accumulate full response
  let fullResponse = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = chatbaseRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } finally {
        controller.close();
        try {
          if (fullResponse.trim()) {
            await prisma.aiMessage.create({
              data: { conversationId, role: "assistant", content: fullResponse.trim() },
            });
            await prisma.aiConversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });
          }
        } catch (err) {
          console.error("[assistant/chat] Failed to save assistant message:", err);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
