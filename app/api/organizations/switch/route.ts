import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMemberships } from "@/src/lib/organization-service";
import { resolveSwitch } from "@/src/lib/organizations";

// Valida que el usuario sea miembro del destino y devuelve org, rol y permisos de ESA membresía.
// El cliente pasa `currentOrganizationId` a `update()` de next-auth; el callback jwt (auth.ts) vuelve a validar en el servidor.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { organizationId } = (await req.json().catch(() => ({}))) as { organizationId?: unknown };
  const claims = resolveSwitch(await listMemberships(userId), organizationId);
  if (!claims) return NextResponse.json({ error: "No eres miembro de esa organización" }, { status: 403 });
  return NextResponse.json(claims);
}
