import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { granolaScope } from "@/src/lib/granola-auth";

/** Sesiones de Granola sin cita asignada (más recientes primero), para vincularlas a mano. */
export async function GET() {
  const access = await granolaScope();
  if ("error" in access) return access.error;
  // Las sesiones sin asignar pueden ser reuniones ajenas al CRM (personales, de RR. HH.): solo las ve quien administra la conexión.
  if (!access.scope.canManage) return NextResponse.json([]);
  const notes = await prisma.granolaNote.findMany({
    where: { organizationId: access.scope.organizationId, appointmentId: null },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: { id: true, title: true, url: true, startedAt: true, attendees: true, _count: { select: { items: true } } },
  });
  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      startedAt: n.startedAt,
      attendees: safeJson(n.attendees),
      itemCount: n._count.items,
    })),
  );
}

function safeJson(raw: string | null): unknown[] {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
