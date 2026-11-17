import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptSuggestion, dismissSuggestion } from "@/src/lib/suggestions-service";

/** Decide una sugerencia: `{ action: "accept" }` la agrega al CRM; `{ action: "dismiss" }` la descarta. */
export async function POST(req: Request, context: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, sid } = await context.params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "dismiss") return NextResponse.json({ error: "La acción debe ser accept o dismiss." }, { status: 400 });

  if (action === "dismiss") {
    const result = await dismissSuggestion(session.currentOrganizationId, id, sid);
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
  }
  const result = await acceptSuggestion(session.currentOrganizationId, session.user.id, id, sid);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ ok: true, resultType: result.resultType, resultId: result.resultId, message: result.message });
}
