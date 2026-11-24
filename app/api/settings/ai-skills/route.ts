import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSkills, saveSkills } from "@/src/lib/ai-skills-store";
import { canManageTeam } from "@/src/lib/permissions";

// Habilidades del asistente (comandos /…): cualquiera de la organización las lee; solo dueño o administrador las cambia.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await listSkills(session.currentOrganizationId));
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageTeam(session.role)) return NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar las habilidades." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { custom?: unknown; disabledFactory?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  try {
    return NextResponse.json(await saveSkills(session.currentOrganizationId, { custom: body.custom, disabledFactory: body.disabledFactory }));
  } catch (error) {
    console.error("[ai-skills] no se pudo guardar:", error instanceof Error ? error.name : "error");
    return NextResponse.json({ error: "No se pudo guardar. Inténtalo de nuevo." }, { status: 500 });
  }
}
