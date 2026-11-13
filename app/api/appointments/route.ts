import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { prisma } from "@/src/lib/db";
import { syncAppointmentToCalendar } from "@/src/lib/google-calendar";
import { buildManualAppointment, resolveTimezone } from "@/src/lib/manual-appointment";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: session.currentOrganizationId,
      ...(status ? { status } : {})
    },
    include: {
      appointmentType: { select: { name: true, duration: true, color: true } },
      contact: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { startTime: "asc" }
  });
  return NextResponse.json(appointments);
}

/**
 * Crea una cita a mano, sin pasar por la disponibilidad. Puede ligarse a un contacto, un lead o un cliente de mensualidad.
 * Una cita que se empalma con otra no se rechaza: se crea y la respuesta trae `overlaps`.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.currentOrganizationId;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  // El tipo es opcional: sin tipo la cita es un horario apartado que bloquea todas las agendas.
  const appointmentType = body.appointmentTypeId
    ? await prisma.appointmentType.findFirst({
        where: { id: String(body.appointmentTypeId), organizationId },
        select: { id: true, name: true, duration: true, location: true },
      })
    : null;
  if (body.appointmentTypeId && !appointmentType) return NextResponse.json({ error: "Tipo de cita no encontrado." }, { status: 400 });

  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  // La hora se lee en la zona del navegador que la crea; si no llega, la de la organización.
  const timezone = resolveTimezone(body.timezone, organization?.timezone || "America/Mexico_City");

  const built = buildManualAppointment(body, appointmentType, timezone);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  // Vínculos opcionales: cada uno debe pertenecer a la organización.
  let contactId: string | null = null;
  let dealId: string | null = null;
  if (body.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: String(body.dealId), organizationId }, select: { id: true, contactId: true } });
    if (!deal) return NextResponse.json({ error: "Lead no encontrado" }, { status: 400 });
    dealId = deal.id;
    contactId = deal.contactId;
  }
  if (body.clientId) {
    const client = await prisma.client.findFirst({ where: { id: String(body.clientId), organizationId }, select: { contactId: true } });
    if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 400 });
    contactId = contactId ?? client.contactId;
  }
  if (body.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: String(body.contactId), organizationId }, select: { id: true } });
    if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
    contactId = contact.id;
  }

  const { startTime, endTime } = built.value;
  const overlaps = await prisma.appointment.count({
    where: { organizationId, status: { not: "CANCELLED" }, startTime: { lt: endTime }, endTime: { gt: startTime } },
  });

  const appointment = await prisma.appointment.create({
    data: {
      ...built.value,
      appointmentTypeId: appointmentType?.id ?? null,
      organizationId,
      contactId,
      dealId,
      timezone,
      status: "CONFIRMED",
      cancelToken: randomUUID(),
    },
    include: {
      appointmentType: { select: { id: true, name: true, duration: true, color: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Google Calendar no debe hacer fallar la cita: ya está guardada.
  syncAppointmentToCalendar(organizationId, {
    id: appointment.id,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    guestName: appointment.guestName,
    guestEmail: appointment.guestEmail,
    notes: appointment.notes,
    googleEventId: null,
    appointmentType: { name: built.value.title ?? appointmentType?.name ?? "Cita", location: appointmentType?.location ?? null },
  })
    .then(async (eventId) => {
      if (eventId) await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId: eventId } });
    })
    .catch((error) => console.error("[appointments] Google Calendar sync error:", error));

  return NextResponse.json({ ...appointment, overlaps }, { status: 201 });
}
