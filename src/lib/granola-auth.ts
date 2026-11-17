import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageTeam } from "@/src/lib/permissions";

export type GranolaScope = { organizationId: string; userId: string; canManage: boolean };

/** Sesión + organización de quien llama. `admin` exige OWNER/ADMIN (conectar, cambiar o quitar la conexión). */
export async function granolaScope(options: { admin?: boolean } = {}): Promise<{ scope: GranolaScope } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  const canManage = canManageTeam(session.role);
  if (options.admin && !canManage) {
    return { error: NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar la conexión con Granola." }, { status: 403 }) };
  }
  return { scope: { organizationId: session.currentOrganizationId, userId: session.user.id, canManage } };
}
