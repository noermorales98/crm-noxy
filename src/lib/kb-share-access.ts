import { prisma } from "@/src/lib/db";
import type { KbShareRole } from "@prisma/client";

export type KbShareWithPage = {
  id: string;
  token: string;
  role: KbShareRole;
  isEnabled: boolean;
  includeChildren: boolean;
  organizationId: string;
  pageId: string;
  page: {
    id: string;
    title: string;
    isFolder: boolean;
    organizationId: string;
  };
};

const ROLE_RANK: Record<KbShareRole, number> = {
  READER: 1,
  COMMENTATOR: 2,
  EDITOR: 3,
};

export function hasShareRole(actual: KbShareRole, required: KbShareRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export async function getShareByToken(token: string): Promise<KbShareWithPage | null> {
  const share = await prisma.kbShare.findFirst({
    where: { token, isEnabled: true },
    include: {
      page: {
        select: { id: true, title: true, isFolder: true, organizationId: true },
      },
    },
  });
  return share;
}

export async function isPageInShareTree(
  share: KbShareWithPage,
  pageId: string
): Promise<boolean> {
  if (pageId === share.pageId) return true;
  if (!share.includeChildren) return false;

  let currentId: string | null = pageId;
  const orgId = share.organizationId;

  while (currentId) {
    const row: { id: string; parentId: string | null } | null = await prisma.kbPage.findFirst({
      where: { id: currentId, organizationId: orgId },
      select: { id: true, parentId: true },
    });
    if (!row) return false;
    if (row.id === share.pageId) return true;
    currentId = row.parentId;
  }

  return false;
}

export async function assertSharePageAccess(
  token: string,
  pageId: string,
  requiredRole: KbShareRole
) {
  const share = await getShareByToken(token);
  if (!share) throw new ShareAccessError("Enlace no válido o desactivado", 404);

  if (!hasShareRole(share.role, requiredRole)) {
    throw new ShareAccessError("No tienes permiso para esta acción", 403);
  }

  const inTree = await isPageInShareTree(share, pageId);
  if (!inTree) throw new ShareAccessError("Página no encontrada", 404);

  const page = await prisma.kbPage.findFirst({
    where: { id: pageId, organizationId: share.organizationId },
  });
  if (!page) throw new ShareAccessError("Página no encontrada", 404);

  return { share, page };
}

export class ShareAccessError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ShareAccessError";
  }
}

export type PublicTreeNode = {
  id: string;
  title: string;
  isFolder: boolean;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  children: PublicTreeNode[];
};

export async function buildPublicTree(
  orgId: string,
  rootId: string
): Promise<PublicTreeNode[]> {
  const all = await prisma.kbPage.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      title: true,
      isFolder: true,
      emoji: true,
      iconColor: true,
      iconBg: true,
      parentId: true,
      sortOrder: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  const byParent = new Map<string | null, typeof all>();
  for (const p of all) {
    const key = p.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }

  function build(parentId: string): PublicTreeNode[] {
    return (byParent.get(parentId) ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      isFolder: p.isFolder,
      emoji: p.emoji,
      iconColor: p.iconColor,
      iconBg: p.iconBg,
      children: p.isFolder ? build(p.id) : [],
    }));
  }

  return build(rootId);
}

export function toPublicPagePayload(page: {
  id: string;
  title: string;
  content: string | null;
  isFolder: boolean;
  markdownTheme: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  updatedAt: Date;
}) {
  return {
    id: page.id,
    title: page.title,
    content: page.content ?? "",
    isFolder: page.isFolder,
    markdownTheme: page.markdownTheme,
    emoji: page.emoji,
    iconColor: page.iconColor,
    iconBg: page.iconBg,
    updatedAt: page.updatedAt.toISOString(),
  };
}
