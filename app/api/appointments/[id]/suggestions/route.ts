import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { hasPermission } from "@/src/lib/permissions";
import { generateSuggestions, listSuggestions } from "@/src/lib/suggestions-service";

export const maxDuration = 60;

async function scope() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return null;
  return { userId: session.user.id, organizationId: session.currentOrganizationId, canUseAi: hasPermission(session.role, session.permissions, "assistant") };
}

/** Sugerencias de la cita (pendientes primero, luego agregadas y descartadas). */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await scope();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const exists = await prisma.appointment.findFirst({ where: { id, organizationId: access.organizationId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  return NextResponse.json(await listSuggestions(access.organizationId, id));
}

/** «Generar sugerencias»: la IA lee las notas de la cita y propone acciones. No crea nada en el CRM. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await scope();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Generar gasta créditos de IA: lo mismo que el asistente, solo con su permiso (el dueño y los administradores siempre lo tienen).
  if (!access.canUseAi) return NextResponse.json({ error: "No tienes permiso para usar la IA. Pídeselo a un administrador." }, { status: 403 });
  const { id } = await context.params;
  const result = await generateSuggestions(access.organizationId, access.userId, id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ created: result.created, total: result.total });
}
