import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

// POST /api/settings/digest/activate
// «Activar mi resumen»: enciende el resumen del usuario. Si no tenía horario, lo crea con los valores
// por defecto (diario, 8:00). Si ya lo tenía, solo lo enciende y respeta su configuración.
// Exige WhatsApp (CallMeBot) configurado: sin él el resumen no tendría a dónde llegar.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const callMeBot = await prisma.callMeBot.findUnique({ where: { userId: session.user.id } });
    if (!callMeBot?.phone || !callMeBot.apiKey) {
      return NextResponse.json({ error: "Configura tu WhatsApp (CallMeBot) antes de activar el resumen." }, { status: 400 });
    }

    const schedule = await prisma.digestSchedule.upsert({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      update: { enabled: true },
      create: { userId: session.user.id, organizationId: orgId, enabled: true },
    });
    return NextResponse.json({ enabled: schedule.enabled, hour: schedule.hour, minute: schedule.minute, frequency: schedule.frequency });
  } catch (error) {
    console.error("[settings/digest/activate]", error);
    return NextResponse.json({ error: "No se pudo activar el resumen" }, { status: 500 });
  }
}
