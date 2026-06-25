import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response("No org", { status: 400 });

  const record = await prisma.customAiModel.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!record) return new Response("Not found", { status: 404 });

  const body = await req.json();
  const { name, group, description, tags, enabled } = body;

  const updated = await prisma.customAiModel.update({
    where: { id },
    data: {
      name: name?.trim() ?? record.name,
      group: group?.trim() || record.group,
      description: description?.trim() ?? record.description,
      tags: tags !== undefined
        ? JSON.stringify(tags.split(",").map((t: string) => t.trim()).filter(Boolean))
        : record.tags,
      enabled: enabled ?? record.enabled,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response("No org", { status: 400 });

  const record = await prisma.customAiModel.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!record) return new Response("Not found", { status: 404 });

  await prisma.customAiModel.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
