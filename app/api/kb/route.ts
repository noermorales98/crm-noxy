import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { defaultIconForNewPage } from "@/src/lib/kb-icons";

const kbPageSelect = {
  id: true,
  title: true,
  emoji: true,
  iconColor: true,
  iconBg: true,
  parentId: true,
  sortOrder: true,
  isFolder: true,
  isPublished: true,
  updatedAt: true,
  _count: { select: { children: true, relations: true } },
} as const;

export async function GET(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const all = searchParams.get("all") === "true";

  const where: { organizationId: string; parentId?: string | null } = { organizationId: orgId };
  if (!all) where.parentId = parentId ?? null;

  const pages = await prisma.kbPage.findMany({
    where,
    select: kbPageSelect,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, emoji, iconColor, iconBg, parentId, content, isFolder } = await req.json();

  if (isFolder && parentId) {
    const parent = await prisma.kbPage.findFirst({
      where: { id: parentId, organizationId: orgId },
      select: { isFolder: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }
    if (!parent.isFolder) {
      return NextResponse.json(
        { error: "Solo se pueden crear carpetas dentro de otras carpetas o en la raíz" },
        { status: 400 }
      );
    }
  }

  const maxOrder = await prisma.kbPage.aggregate({
    where: { organizationId: orgId, parentId: parentId ?? null },
    _max: { sortOrder: true },
  });

  const folder = isFolder ?? false;
  const defaults = defaultIconForNewPage(folder);

  const page = await prisma.kbPage.create({
    data: {
      organizationId: orgId,
      title: title || "Sin título",
      emoji: emoji ?? defaults.emoji,
      iconColor: iconColor ?? defaults.iconColor,
      iconBg: iconBg ?? defaults.iconBg,
      parentId: parentId || null,
      content: content || "",
      isFolder: folder,
      markdownTheme: "minimal",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(page, { status: 201 });
}
