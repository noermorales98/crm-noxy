import { prisma } from "@/src/lib/db";

export interface KbTreeNodeDto {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: Date;
  children: KbTreeNodeDto[];
}

export interface KbFolderStats {
  directPages: number;
  directFolders: number;
  totalPages: number;
  publishedPages: number;
  draftPages: number;
}

type PageRow = {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: Date;
  parentId: string | null;
};

async function loadOrgPages(orgId: string): Promise<PageRow[]> {
  return prisma.kbPage.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      title: true,
      emoji: true,
      iconColor: true,
      iconBg: true,
      isFolder: true,
      isPublished: true,
      updatedAt: true,
      parentId: true,
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

function buildTree(all: PageRow[], parentId: string): KbTreeNodeDto[] {
  return all
    .filter((p) => p.parentId === parentId)
    .map((p) => ({
      id: p.id,
      title: p.title,
      emoji: p.emoji,
      iconColor: p.iconColor,
      iconBg: p.iconBg,
      isFolder: p.isFolder,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt,
      children: buildTree(all, p.id),
    }));
}

function collectDescendantIds(all: PageRow[], rootId: string): Set<string> {
  const byParent = new Map<string | null, PageRow[]>();
  for (const p of all) {
    const key = p.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }

  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    const kids = byParent.get(id) ?? [];
    for (const k of kids) {
      ids.add(k.id);
      stack.push(k.id);
    }
  }
  return ids;
}

export async function getFolderStatsAndTree(orgId: string, folderId: string) {
  const all = await loadOrgPages(orgId);
  const folder = all.find((p) => p.id === folderId);
  if (!folder || !folder.isFolder) return null;

  const direct = all.filter((p) => p.parentId === folderId);
  const directPages = direct.filter((p) => !p.isFolder).length;
  const directFolders = direct.filter((p) => p.isFolder).length;

  const descendantIds = collectDescendantIds(all, folderId);
  const descendants = all.filter((p) => descendantIds.has(p.id));
  const pagesInTree = descendants.filter((p) => !p.isFolder);
  const totalPages = pagesInTree.length;
  const publishedPages = pagesInTree.filter((p) => p.isPublished).length;
  const draftPages = totalPages - publishedPages;

  const folderStats: KbFolderStats = {
    directPages,
    directFolders,
    totalPages,
    publishedPages,
    draftPages,
  };

  const tree = buildTree(all, folderId);

  return { folderStats, tree };
}
