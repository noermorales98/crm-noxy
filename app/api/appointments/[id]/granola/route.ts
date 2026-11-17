import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { canManageTeam } from "@/src/lib/permissions";

/** Resumen, notas, pasos y tareas de las sesiones de Granola ligadas a una cita. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = session.currentOrganizationId;
  const { id } = await context.params;

  const appointment = await prisma.appointment.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!appointment) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

  const notes = await prisma.granolaNote.findMany({
    where: { organizationId, appointmentId: id },
    orderBy: { startedAt: "asc" },
    select: {
      id: true,
      source: true,
      title: true,
      url: true,
      startedAt: true,
      summary: true,
      privateNotes: true,
      linkSource: true,
      updatedAt: true,
      items: {
        orderBy: { position: "asc" },
        select: { id: true, text: true, taskId: true, task: { select: { id: true, title: true, isCompleted: true } } },
      },
    },
  });
  // Las notas privadas son del dueño de la cuenta de Granola: solo las ve quien administra.
  const canManage = canManageTeam(session.role);
  return NextResponse.json(notes.map((note) => (canManage ? note : { ...note, privateNotes: null })));
}
