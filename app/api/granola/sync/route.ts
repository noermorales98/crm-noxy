import { NextResponse, after } from "next/server";
import { granolaScope } from "@/src/lib/granola-auth";
import { granolaRedirectUrl, runGranolaSync } from "@/src/lib/granola-service";
import { autoGenerateForAppointments } from "@/src/lib/suggestions-service";

export const maxDuration = 60;

/** «Sincronizar ahora»: cualquier miembro con acceso a citas. */
export async function POST(req: Request) {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  const result = await runGranolaSync(access.scope.organizationId, granolaRedirectUrl(req.url));
  if (!result.ok) {
    const status = result.code === "NOT_CONNECTED" || result.code === "BUSY" ? 409 : 502;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  // Las citas cuyas notas llegaron o cambiaron reciben sugerencias solas, después de responder.
  const { appointmentIds, ...summary } = result;
  if (appointmentIds.length) after(() => autoGenerateForAppointments(access.scope.organizationId, appointmentIds));
  return NextResponse.json(summary);
}
