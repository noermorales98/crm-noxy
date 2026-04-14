import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId"); // null = root pages
  const all = searchParams.get("all") === "true";

  const where: any = { organizationId: orgId };
  if (!all) where.parentId = parentId ?? null;

  const pages = await prisma.kbPage.findMany({
    where,
    select: {
      id: true,
      title: true,
      emoji: true,
      parentId: true,
      sortOrder: true,
      isFolder: true,
      isPublished: true,
      updatedAt: true,
      _count: { select: { children: true, relations: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, emoji, parentId, content, isFolder } = await req.json();

  // Max sort order for siblings
  const maxOrder = await prisma.kbPage.aggregate({
    where: { organizationId: orgId, parentId: parentId ?? null },
    _max: { sortOrder: true },
  });

  const page = await prisma.kbPage.create({
    data: {
      organizationId: orgId,
      title: title || "Sin título",
      emoji: emoji || null,
      parentId: parentId || null,
      content: content || "",
      isFolder: isFolder ?? false,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(page, { status: 201 });
}
