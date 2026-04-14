import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    include: {
      parent: { select: { id: true, title: true, emoji: true, parentId: true } },
      children: {
        select: {
          id: true, title: true, emoji: true, sortOrder: true, updatedAt: true,
          _count: { select: { children: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      relations: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, emoji, content, isPublished, parentId, sortOrder } = body;

  const page = await prisma.kbPage.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(title !== undefined && { title }),
      ...(emoji !== undefined && { emoji }),
      ...(content !== undefined && { content }),
      ...(isPublished !== undefined && { isPublished }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  if (page.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Detach children instead of cascading delete — so user doesn't lose content
  await prisma.kbPage.updateMany({
    where: { parentId: id, organizationId: orgId },
    data: { parentId: null },
  });

  await prisma.kbPage.deleteMany({ where: { id, organizationId: orgId } });
  return new NextResponse(null, { status: 204 });
}
