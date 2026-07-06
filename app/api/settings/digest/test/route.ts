import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import {
  buildDigestContext,
  generateDigestMessage,
  runDigestForUser,
} from "@/src/lib/digest";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const mode = body.mode as "preview" | "send" | undefined;

  const schedule = await prisma.digestSchedule.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  const includeGoogleCalendar = schedule?.includeGoogleCalendar ?? true;
  const aiModelId = schedule?.aiModelId ?? "chatbase";

  try {
    if (mode === "send") {
      const result = await runDigestForUser(session.user.id, orgId, {
        sendWhatsApp: true,
        skipScheduleCheck: true,
        updateLastSent: false,
      });
      return NextResponse.json({
        message: result.message,
        sent: result.sent,
      });
    }

    const context = await buildDigestContext(orgId, session.user.id, { includeGoogleCalendar });
    const message = await generateDigestMessage(context, { orgId, modelId: aiModelId });
    return NextResponse.json({ message, context });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error al generar resumen" }, { status: 500 });
  }
}
