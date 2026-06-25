import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

const PROTECTED_BUILTIN_IDS = new Set(["chatbase"]);

async function getOrgId(session: any) {
  return (session as any).currentOrganizationId as string | undefined;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return new Response("No org", { status: 400 });

  const models = await prisma.customAiModel.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });

  let hiddenBuiltins: string[] = [];
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { hiddenAiModels: true },
    });
    hiddenBuiltins = JSON.parse(org?.hiddenAiModels || "[]");
  } catch {
    hiddenBuiltins = [];
  }

  return new Response(JSON.stringify({ models, hiddenBuiltins }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return new Response("No org", { status: 400 });

  const body = await req.json();
  const { modelId, name, group, description, tags } = body;

  if (!modelId?.trim() || !name?.trim()) {
    return Response.json({ error: "modelId y name son requeridos" }, { status: 400 });
  }

  const existing = await prisma.customAiModel.findUnique({
    where: { organizationId_modelId: { organizationId: orgId, modelId: modelId.trim() } },
  });
  if (existing) {
    return Response.json({ error: "Ya existe un modelo con ese ID" }, { status: 409 });
  }

  const model = await prisma.customAiModel.create({
    data: {
      organizationId: orgId,
      modelId: modelId.trim(),
      name: name.trim(),
      group: group?.trim() || "Personalizados",
      description: description?.trim() || "",
      tags: JSON.stringify(
        (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean)
      ),
    },
  });

  return Response.json(model, { status: 201 });
}

// PATCH → hide or restore a built-in model
// body: { modelId: string; action: "hide" | "restore" }
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return new Response("No org", { status: 400 });

  const { modelId, action } = await req.json();
  if (!modelId || !action) {
    return Response.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  if (action === "hide" && PROTECTED_BUILTIN_IDS.has(modelId)) {
    return Response.json({ error: "Este modelo no se puede ocultar" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { hiddenAiModels: true },
  });
  if (!org) return new Response("Org not found", { status: 404 });

  let hidden: string[] = [];
  try {
    hidden = JSON.parse(org.hiddenAiModels || "[]");
  } catch {
    hidden = [];
  }

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
