import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { normalizeShareTags } from "@/src/lib/share-metadata";
import {
  DEFAULT_SHARE_ICON_BG,
  normalizeShareIconBg,
  parseShareIcon,
} from "@/src/lib/share-favicon";
import type { KbShareRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const VALID_ROLES: KbShareRole[] = ["READER", "EDITOR", "COMMENTATOR"];

async function getOrgPage(id: string, orgId: string) {
  return prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      title: true,
      isFolder: true,
      publicTitle: true,
      shareTags: true,
      shareIcon: true,
      shareIconBg: true,
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  if (!session?.user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await getOrgPage(id, orgId);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const share = await prisma.kbShare.findUnique({ where: { pageId: id } });
  const pendingCount = await prisma.kbSuggestion.count({
    where: { pageId: id, organizationId: orgId, status: "PENDING" },
  });

  return NextResponse.json({
    share,
    pendingCount,
    publicTitle: page.publicTitle,
    shareTags: page.shareTags,
    shareIcon: page.shareIcon,
    shareIconBg: page.shareIconBg,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  if (!session?.user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await getOrgPage(id, orgId);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const role = (body.role as KbShareRole) ?? "READER";
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const share = await prisma.kbShare.upsert({
    where: { pageId: id },
    create: {
      pageId: id,
      organizationId: orgId,
      role,
      isEnabled: true,
      includeChildren: page.isFolder ? body.includeChildren !== false : false,
    },
    update: {
      role,
      isEnabled: true,
      includeChildren: page.isFolder ? body.includeChildren !== false : false,
    },
  });

  return NextResponse.json(share);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  if (!session?.user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await getOrgPage(id, orgId);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.kbShare.findUnique({ where: { pageId: id } });
  if (!existing) return NextResponse.json({ error: "Share not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    role?: KbShareRole;
    isEnabled?: boolean;
    includeChildren?: boolean;
    token?: string;
  } = {};

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.isEnabled !== undefined) data.isEnabled = !!body.isEnabled;
  if (body.includeChildren !== undefined && page.isFolder) {
    data.includeChildren = !!body.includeChildren;
  }
  if (body.regenerateToken) {
    data.token = crypto.randomUUID().replace(/-/g, "");
  }

  const share = await prisma.kbShare.update({
    where: { pageId: id },
    data,
  });

  let publicTitle = page.publicTitle;
  let shareTags = page.shareTags;
  let shareIcon = page.shareIcon;
  let shareIconBg = page.shareIconBg;
  const pageData: {
    publicTitle?: string | null;
    shareTags?: string | null;
    shareIcon?: string | null;
    shareIconBg?: string | null;
  } = {};

  if (page.isFolder && body.publicTitle !== undefined) {
    const nextTitle = typeof body.publicTitle === "string" ? body.publicTitle.trim() : "";
    pageData.publicTitle = nextTitle || null;
  }
  if (page.isFolder && body.shareTags !== undefined) {
    pageData.shareTags = normalizeShareTags(body.shareTags);
  }
  if (body.shareIcon !== undefined) {
    const icon = parseShareIcon(body.shareIcon);
    if (icon === "invalid") {
      return NextResponse.json({ error: "Icono inválido" }, { status: 400 });
    }
    pageData.shareIcon = icon;
    if (!icon) pageData.shareIconBg = null;
  }
  if (body.shareIconBg !== undefined && pageData.shareIcon !== null) {
    const bg = normalizeShareIconBg(body.shareIconBg);
    if (typeof body.shareIconBg === "string" && body.shareIconBg.trim() && !bg) {
      return NextResponse.json({ error: "Color inválido" }, { status: 400 });
    }
    if (bg) pageData.shareIconBg = bg;
  }
  const nextIcon = pageData.shareIcon === undefined ? shareIcon : pageData.shareIcon;
  if (nextIcon && pageData.shareIconBg === undefined && !shareIconBg) {
    pageData.shareIconBg = DEFAULT_SHARE_ICON_BG;
  }

  if (Object.keys(pageData).length > 0) {
    const updated = await prisma.kbPage.update({
      where: { id },
      data: pageData,
      select: { publicTitle: true, shareTags: true, shareIcon: true, shareIconBg: true },
    });
    publicTitle = updated.publicTitle;
    shareTags = updated.shareTags;
    shareIcon = updated.shareIcon;
    shareIconBg = updated.shareIconBg;
  }

  return NextResponse.json({ ...share, publicTitle, shareTags, shareIcon, shareIconBg });
}
