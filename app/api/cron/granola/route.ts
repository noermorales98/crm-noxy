import { NextResponse, after } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaRedirectUrl, runGranolaSync } from "@/src/lib/granola-service";
import { autoGenerateForAppointments } from "@/src/lib/suggestions-service";
import { autoDraftFollowups } from "@/src/lib/followup-service";

export const maxDuration = 60;

/** Sincroniza las organizaciones con Granola conectado. Mismo secreto que los demás crons. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if ((!cronSecret && process.env.NODE_ENV === "production") || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.granolaConfig.findMany({ where: { status: { in: ["CONNECTED", "ERROR"] } }, select: { organizationId: true } });
  const redirectUrl = granolaRedirectUrl(req.url);
  let synced = 0;
  const errors: string[] = [];
  for (const { organizationId } of configs) {
    const result = await runGranolaSync(organizationId, redirectUrl);
    if (result.ok) {
      synced += result.synced;
      // Sugerencias automáticas para las citas con notas nuevas (tope por organización; el resto, en el siguiente evento).
      if (result.appointmentIds.length) after(() => autoGenerateForAppointments(organizationId, result.appointmentIds, 2));
      // Seguimiento tras la cita: borrador (nunca se envía) para las citas con notas que aún no lo tienen; una por ejecución.
      after(() => autoDraftFollowups(organizationId, result.appointmentIds, 1));
    } else if (result.code !== "BUSY") errors.push(`${organizationId}: ${result.code}`);
  }
  return NextResponse.json({ organizations: configs.length, synced, errors });
}
