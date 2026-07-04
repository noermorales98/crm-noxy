import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { getFolderStatsAndTree } from "@/src/lib/kb-folder-stats";
import { DEFAULT_MARKDOWN_THEME, isValidMarkdownTheme } from "@/src/lib/kb-markdown-themes";
import { createKbPageRevisionIfChanged } from "@/src/lib/kb-revisions";

type Params = { params: Promise<{ id: string }> };

const childSelect = {
  id: true,
  title: true,
  emoji: true,
  iconColor: true,
  iconBg: true,
  sortOrder: true,
  updatedAt: true,
  isFolder: true,
  isPublished: true,
  _count: { select: { children: true } },
} as const;

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    include: {
      parent: { select: { id: true, title: true, emoji: true, iconColor: true, iconBg: true, parentId: true } },
      children: {
        select: childSelect,
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      relations: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ancestorIds: string[] = [];
  let currentParentId = page.parentId;
  while (currentParentId) {
    ancestorIds.unshift(currentParentId);
    const parent = await prisma.kbPage.findFirst({
      where: { id: currentParentId, organizationId: orgId },
      select: { parentId: true },
    });
    if (!parent) break;
    currentParentId = parent.parentId;
  }

  const ancestors =
    ancestorIds.length > 0
      ? await prisma.kbPage.findMany({
          where: { id: { in: ancestorIds }, organizationId: orgId },
          select: { id: true, title: true, emoji: true, iconColor: true, iconBg: true },
        }).then((rows) => {
          const byId = new Map(rows.map((r) => [r.id, r]));
          return ancestorIds.map((aid) => byId.get(aid)).filter(Boolean) as Array<{
            id: string;
            title: string;
            emoji: string | null;
            iconColor: string | null;
            iconBg: string | null;
          }>;
        })
      : [];

  let folderStats = null;
  let tree = null;
  if (page.isFolder) {
    const stats = await getFolderStatsAndTree(orgId, id);
    if (stats) {
      folderStats = stats.folderStats;
      tree = stats.tree;
    }
  }

  return NextResponse.json({ ...page, ancestorIds, ancestors, folderStats, tree });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, emoji, iconColor, iconBg, content, isPublished, parentId, sortOrder, markdownTheme } = body;

    const themeValue =
      markdownTheme !== undefined
        ? isValidMarkdownTheme(markdownTheme)
          ? markdownTheme
          : DEFAULT_MARKDOWN_THEME
        : undefined;

    const existing = await prisma.kbPage.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, isFolder: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const page = await prisma.kbPage.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...(title !== undefined && { title }),
        ...(emoji !== undefined && { emoji }),
        ...(iconColor !== undefined && { iconColor }),
        ...(iconBg !== undefined && { iconBg }),
        ...(content !== undefined && { content }),
        ...(isPublished !== undefined && { isPublished }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(themeValue !== undefined && { markdownTheme: themeValue }),
      },
    });

    if (page.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.kbPage.findFirst({
      where: { id, organizationId: orgId },
    });

    if (updated && !updated.isFolder) {
      try {
        await createKbPageRevisionIfChanged(id, orgId, session.user.id, {
          title: updated.title,
          emoji: updated.emoji,
          iconColor: updated.iconColor,
          iconBg: updated.iconBg,
          content: updated.content,
          markdownTheme: updated.markdownTheme,
          isPublished: updated.isPublished,
        });
      } catch (revisionErr) {
        console.error("[kb PATCH] revision save failed:", revisionErr);
      }
    }

    return NextResponse.json({ ok: true, updatedAt: updated?.updatedAt ?? null });
  } catch (err) {
    console.error("[kb PATCH]", err);
    return NextResponse.json(
      { error: "Error al guardar la página", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.kbPage.updateMany({
    where: { parentId: id, organizationId: orgId },
    data: { parentId: null },
  });

  await prisma.kbPage.deleteMany({ where: { id, organizationId: orgId } });
  return new NextResponse(null, { status: 204 });
}
