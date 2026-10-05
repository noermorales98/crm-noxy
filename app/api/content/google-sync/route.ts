import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { contentGoogleSyncStatus, syncPendingContentItems } from "@/src/lib/content-google-sync";

async function requireOrg() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  return orgId;
}

export async function GET() {
  const orgId = await requireOrg();
  if (orgId instanceof NextResponse) return orgId;
  return NextResponse.json(await contentGoogleSyncStatus(orgId));
}

export async function POST() {
  const orgId = await requireOrg();
  if (orgId instanceof NextResponse) return orgId;
  return NextResponse.json(await syncPendingContentItems(orgId));
}
