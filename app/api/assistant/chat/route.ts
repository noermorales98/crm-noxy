import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { buildCrmContext } from "@/src/lib/ai-context";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  // Build live CRM context for the system prompt
  const systemPrompt = await buildCrmContext(session.user.id!, orgId);

  // Build message history (exclude system messages stored in DB)
  const messages: Anthropic.MessageParam[] = [
    ...conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: trimmed },
  ];

  // Stream from Claude
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        console.error("[assistant/chat] Claude stream error:", err);
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
