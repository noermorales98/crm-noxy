import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAiPrefs, saveAiPrefs } from "@/src/lib/ai-keys";
import { canManageTeam } from "@/src/lib/permissions";

// Preferencias de IA de la organización: modelo predeterminado, cambio automático si falla y modelos de respaldo.

const cleanId = (v: unknown) => (typeof v === "string" && v.trim().length > 0 && v.trim().length <= 160 ? v.trim() : null);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await getAiPrefs(session.currentOrganizationId));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageTeam(session.role)) return NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar esto." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });

  const patch: Parameters<typeof saveAiPrefs>[1] = {};
  if ("defaultModelId" in body) patch.defaultModelId = body.defaultModelId === null ? null : cleanId(body.defaultModelId);
  if ("autoSwitch" in body) patch.autoSwitch = body.autoSwitch !== false;
  if ("fallbackModelIds" in body) {
    if (!Array.isArray(body.fallbackModelIds)) return NextResponse.json({ error: "Los respaldos deben ser una lista." }, { status: 400 });
    patch.fallbackModelIds = body.fallbackModelIds.map(cleanId).filter((id: string | null): id is string => id !== null).slice(0, 5);
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
  return NextResponse.json(await saveAiPrefs(session.currentOrganizationId, patch));
}
