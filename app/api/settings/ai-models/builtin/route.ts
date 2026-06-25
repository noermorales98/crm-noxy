import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { AI_MODELS } from "@/src/lib/ai-models";

const PROTECTED_IDS = new Set(["chatbase"]);

// PATCH → hide or restore a built-in model
// body: { modelId: string; action: "hide" | "restore" }
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response("No org", { status: 400 });

  const { modelId, action } = await req.json();
  if (!modelId || !action) return new Response("Missing modelId or action", { status: 400 });
  if (action === "hide" && PROTECTED_IDS.has(modelId)) {
    return new Response("Cannot hide this model", { status: 403 });
  }
  if (action === "hide" && !AI_MODELS.some((m) => m.id === modelId)) {
    return new Response("Not a built-in model", { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { hiddenAiModels: true },
  });
  if (!org) return new Response("Not found", { status: 404 });

  let hidden: string[] = JSON.parse(org.hiddenAiModels || "[]");

  if (action === "hide") {
    if (!hidden.includes(modelId)) hidden.push(modelId);
  } else {
    hidden = hidden.filter((id) => id !== modelId);
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { hiddenAiModels: JSON.stringify(hidden) },
  });

  return Response.json({ hiddenBuiltins: hidden });
}
