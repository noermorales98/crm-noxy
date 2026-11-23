import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { applyBulkReminders } from "@/src/lib/content-reminder-bulk";
import { parseBulkReminderInput } from "@/src/lib/content-reminder-input";

// POST /api/content/reminders/bulk
// { clientIds: string[] | "all", enabled: boolean, hour?, minute?, daysBefore? }
// Enciende o apaga los avisos de varios clientes de contenido a la vez.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const parsed = parseBulkReminderInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await applyBulkReminders(orgId, parsed.value);
  return NextResponse.json(result);
}
