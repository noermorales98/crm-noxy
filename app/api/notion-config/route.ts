import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { appSecretKey, encryptSecret } from "@/src/lib/secret-box";
import { parseNotionConfigInput, type NotionConfigView } from "@/src/lib/notion-config";

async function organizationOf() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) return { error: NextResponse.json({ error: "Sin organización" }, { status: 400 }) } as const;
  return { organizationId } as const;
}

async function viewOf(organizationId: string): Promise<NotionConfigView> {
  const row = await prisma.notionConfig.findUnique({ where: { organizationId } });
  if (row) {
    return { configured: true, hasToken: true, databaseId: row.databaseId, docsDatabaseId: row.docsDatabaseId, autoSyncDeals: row.autoSyncDeals, autoSyncDocs: row.autoSyncDocs, source: "db" };
  }
  const fromEnv = Boolean(process.env.NOTION_TOKEN && process.env.NOTION_LEADS_DATABASE_ID);
  return {
    configured: fromEnv,
    hasToken: fromEnv,
    databaseId: fromEnv ? (process.env.NOTION_LEADS_DATABASE_ID ?? null) : null,
    docsDatabaseId: fromEnv ? (process.env.NOTION_DOCS_DATABASE_ID ?? null) : null,
    autoSyncDeals: false,
    autoSyncDocs: false,
    source: fromEnv ? "env" : "none",
  };
}

export async function GET() {
  const scope = await organizationOf();
  if ("error" in scope) return scope.error;
  return NextResponse.json(await viewOf(scope.organizationId));
}

export async function PUT(req: Request) {
  const scope = await organizationOf();
  if ("error" in scope) return scope.error;
  const body = await req.json().catch(() => null);
  const existing = await prisma.notionConfig.findUnique({ where: { organizationId: scope.organizationId }, select: { id: true } });
  const parsed = parseNotionConfigInput(body, Boolean(existing));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { token, databaseId, docsDatabaseId, autoSyncDeals, autoSyncDocs } = parsed.value;
  const flags = { ...(autoSyncDeals !== null ? { autoSyncDeals } : {}), ...(autoSyncDocs !== null ? { autoSyncDocs } : {}) };
  if (existing) {
    await prisma.notionConfig.update({
      where: { organizationId: scope.organizationId },
      data: { databaseId, docsDatabaseId, ...flags, ...(token ? { token: encryptSecret(token, appSecretKey()) } : {}) },
    });
  } else {
    await prisma.notionConfig.create({ data: { organizationId: scope.organizationId, databaseId, docsDatabaseId, ...flags, token: encryptSecret(token!, appSecretKey()) } });
  }
  return NextResponse.json(await viewOf(scope.organizationId));
}

export async function DELETE() {
  const scope = await organizationOf();
  if ("error" in scope) return scope.error;
  await prisma.notionConfig.deleteMany({ where: { organizationId: scope.organizationId } });
  return NextResponse.json(await viewOf(scope.organizationId));
}
