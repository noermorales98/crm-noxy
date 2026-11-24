import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReviewBlocksApproval, setReviewBlocksApproval } from "@/src/lib/ai-skills-store";
import { canManageTeam } from "@/src/lib/permissions";

// Opción de la organización: una revisión grave de la IA impide aprobar la pieza (salvo que se fuerce).

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ blocksApproval: await getReviewBlocksApproval(session.currentOrganizationId) });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageTeam(session.role)) return NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar esto." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { blocksApproval?: unknown } | null;
  if (typeof body?.blocksApproval !== "boolean") return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  await setReviewBlocksApproval(session.currentOrganizationId, body.blocksApproval);
  return NextResponse.json({ blocksApproval: body.blocksApproval });
}
