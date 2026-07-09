import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await prisma.projectActivity.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json(activity);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content, tags, icon, eventDate } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "El contenido de la nota es requerido" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await prisma.projectActivity.create({
    data: {
      type: "NOTE",
      description: content.trim(),
      icon: icon || null,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : undefined,
      eventDate: eventDate ? new Date(eventDate) : null,
      projectId: id,
      organizationId: orgId,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
