import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { syncAppointmentToCalendar } from "@/src/lib/google-calendar";
import { buildManualAppointment, resolveTimezone, utcToZonedParts } from "@/src/lib/manual-appointment";

const STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"];

/**
 * Cambia el estado (`{ status }`) o edita/reprograma la cita (fecha, hora, duración, título, tipo, persona, notas).
 * Los campos que no se envían se conservan. Al cambiar de fecha u hora se reinician los recordatorios.
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.currentOrganizationId;
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: { appointmentType: { select: { id: true, name: true, duration: true, location: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    data.status = body.status;
  }

  const editing = ["title", "appointmentTypeId", "date", "time", "durationMinutes", "guestName", "guestEmail", "guestPhone", "notes"].some((key) => body[key] !== undefined);
  let overlaps = 0;
  let rescheduled = false;
  let typeForSync = existing.appointmentType;
  if (editing) {
    // La hora se lee en la zona del navegador que edita (la misma en que ve la lista); si no llega, la de la cita.
    const timezone = resolveTimezone(body.timezone, existing.timezone || "America/Mexico_City");

    // Tipo: si no se envía se conserva; "" o null lo quita (cita apartada sin agenda).
    let type = existing.appointmentType;
    if ("appointmentTypeId" in body) {
      type = body.appointmentTypeId
        ? await prisma.appointmentType.findFirst({
            where: { id: String(body.appointmentTypeId), organizationId },
            select: { id: true, name: true, duration: true, location: true },
          })
        : null;
      if (body.appointmentTypeId && !type) return NextResponse.json({ error: "Tipo de cita no encontrado." }, { status: 400 });
    }
    typeForSync = type;

    const current = utcToZonedParts(existing.startTime, timezone);
    const built = buildManualAppointment(
      {
        title: body.title !== undefined ? body.title : existing.title,
        date: body.date ?? current.date,
        time: body.time ?? current.time,
        durationMinutes: body.durationMinutes ?? Math.round((existing.endTime.getTime() - existing.startTime.getTime()) / 60000),
        guestName: body.guestName !== undefined ? body.guestName : existing.guestName,
        guestEmail: body.guestEmail !== undefined ? body.guestEmail : existing.guestEmail,
        guestPhone: body.guestPhone !== undefined ? body.guestPhone : existing.guestPhone,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      type,
      timezone,
    );
    if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

    rescheduled = built.value.startTime.getTime() !== existing.startTime.getTime() || built.value.endTime.getTime() !== existing.endTime.getTime();
    Object.assign(data, built.value, { appointmentTypeId: type?.id ?? null, timezone });
    if (rescheduled) Object.assign(data, { reminderSent1h: false, reminderSent10m: false, reminderSent5m: false });

    overlaps = await prisma.appointment.count({
      where: {
        organizationId,
        id: { not: id },
        status: { not: "CANCELLED" },
        startTime: { lt: built.value.endTime },
        endTime: { gt: built.value.startTime },
      },
    });
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No se envió ningún cambio." }, { status: 400 });

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      appointmentType: { select: { id: true, name: true, duration: true, color: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Google Calendar nunca debe hacer fallar el cambio: la cita ya está guardada.
  if (editing && updated.status !== "CANCELLED") {
    syncAppointmentToCalendar(organizationId, {
      id: updated.id,
      startTime: updated.startTime,
      endTime: updated.endTime,
      guestName: updated.guestName,
      guestEmail: updated.guestEmail,
      notes: updated.notes,
      googleEventId: updated.googleEventId,
      appointmentType: { name: updated.title ?? typeForSync?.name ?? "Cita", location: typeForSync?.location ?? null },
    })
      .then(async (eventId) => {
        if (eventId && eventId !== updated.googleEventId) await prisma.appointment.update({ where: { id }, data: { googleEventId: eventId } });
      })
      .catch((error) => console.error("[appointments] Google Calendar sync error:", error));
  }

  return NextResponse.json({ ...updated, overlaps, rescheduled });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || !session.currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await context.params;

    // Verify it exists and belongs to the current org
    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: session.currentOrganizationId }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found or unauthorized" }, { status: 404 });
    }

    await prisma.appointment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
