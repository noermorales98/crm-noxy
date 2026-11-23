import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadAgencyCards } from "@/src/lib/agency-service";

// Panel de agencia: una tarjeta por sub-cuenta del usuario con acceso. El middleware exige el permiso «agency».
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const current = (session as { currentOrganizationId?: string | null }).currentOrganizationId ?? null;
    const cards = await loadAgencyCards(userId, current);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("GET /api/agency/overview error:", error);
    return NextResponse.json({ error: "No se pudo cargar el panel" }, { status: 500 });
  }
}
