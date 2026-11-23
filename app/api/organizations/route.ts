import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSubAccount, listMemberships } from "@/src/lib/organization-service";
import { parseOrganizationInput } from "@/src/lib/organizations";

// GET: mis organizaciones. POST: crear una sub-cuenta (me hace OWNER). Ambas son del usuario, no de la org actual.

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const current = (session as { currentOrganizationId?: string | null }).currentOrganizationId ?? null;
  const rows = await listMemberships(userId);
  return NextResponse.json({
    currentOrganizationId: current,
    organizations: rows.map((m) => ({ id: m.organization.id, name: m.organization.name, timezone: m.organization.timezone, role: m.role, current: m.organizationId === current })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = parseOrganizationInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const { organization } = await createSubAccount(userId, parsed.value);
    return NextResponse.json({ id: organization.id, name: organization.name, timezone: organization.timezone, role: "OWNER" }, { status: 201 });
  } catch (e) {
    console.error("POST /api/organizations", e);
    return NextResponse.json({ error: "No se pudo crear la organización" }, { status: 500 });
  }
}
