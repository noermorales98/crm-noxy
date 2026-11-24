import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { listSchedules, saveSchedules, MAX_SCHEDULES_PER_USER } from "@/src/lib/ai-schedules-store";
import { normalizeSchedule } from "@/src/lib/ai-schedules";
import { runSchedule } from "@/src/lib/ai-schedule-runner";

// Programaciones del asistente de cada persona (solo ve y cambia las suyas), dentro de la organización activa.

async function scope() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return null;
  return { userId: session.user.id, organizationId: session.currentOrganizationId };
}

export async function GET() {
  const me = await scope();
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json((await listSchedules(me.organizationId)).filter((s) => s.userId === me.userId));
}

export async function POST(req: Request) {
  const me = await scope();
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const all = await listSchedules(me.organizationId);
  if (all.filter((s) => s.userId === me.userId).length >= MAX_SCHEDULES_PER_USER) {
    return NextResponse.json({ error: `Máximo ${MAX_SCHEDULES_PER_USER} programaciones por persona.` }, { status: 400 });
  }
  const parsed = normalizeSchedule(await req.json().catch(() => null), me.userId, randomUUID());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await saveSchedules(me.organizationId, [...all, parsed.schedule]);
  return NextResponse.json(parsed.schedule, { status: 201 });
}

/** Activar o pausar (`enabled`) o ejecutar ahora (`run: true`). */
export async function PATCH(req: Request) {
  const me = await scope();
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; enabled?: boolean; run?: boolean } | null;
  const all = await listSchedules(me.organizationId);
  const current = all.find((s) => s.id === body?.id && s.userId === me.userId);
  if (!body || !current) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  let updated = typeof body.enabled === "boolean" ? { ...current, enabled: body.enabled } : current;
  if (body.run === true) updated = await runSchedule(updated, me.organizationId);
  await saveSchedules(me.organizationId, all.map((s) => (s.id === updated.id ? updated : s)));
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const me = await scope();
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const all = await listSchedules(me.organizationId);
  if (!all.some((s) => s.id === id && s.userId === me.userId)) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await saveSchedules(me.organizationId, all.filter((s) => s.id !== id));
  return NextResponse.json({ ok: true });
}
