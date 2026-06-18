import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import type { KbShareRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const VALID_ROLES: KbShareRole[] = ["READER", "EDITOR", "COMMENTATOR"];

async function getOrgPage(id: string, orgId: string) {
  return prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, title: true, isFolder: true },
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

  return NextResponse.json({ share, pendingCount });
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

  return NextResponse.json(share);
}
