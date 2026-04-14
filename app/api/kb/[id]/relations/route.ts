import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.kbPage.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const relations = await prisma.kbPageRelation.findMany({
    where: { pageId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(relations);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { entityType, entityId, entityLabel } = await req.json();

  if (!entityType || !entityId || !entityLabel) {
    return NextResponse.json({ error: "entityType, entityId, entityLabel required" }, { status: 400 });
  }

  const page = await prisma.kbPage.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const relation = await prisma.kbPageRelation.upsert({
    where: { pageId_entityType_entityId: { pageId: id, entityType, entityId } },
    update: { entityLabel },
    create: { pageId: id, entityType, entityId, entityLabel },
  });

  return NextResponse.json(relation, { status: 201 });
}
