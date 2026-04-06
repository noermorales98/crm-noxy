import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

// GET — list appointments for this deal
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id } = await params;

    const deal = await prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const appointments = await prisma.appointment.findMany({
      where: { dealId: id, organizationId },
      orderBy: { startTime: "asc" },
      include: {
        appointmentType: { select: { id: true, name: true, duration: true, color: true } },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/deals/[id]/appointments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — book an appointment linked to this deal
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id } = await params;

    const deal = await prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const body = await req.json();
    const { appointmentTypeId, startTime, guestName, guestEmail, guestPhone, notes } = body;

    if (!appointmentTypeId || !startTime || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: "appointmentTypeId, startTime, guestName y guestEmail son requeridos" },
        { status: 400 }
      );
    }

    // Validate appointment type belongs to org
    const apptType = await prisma.appointmentType.findFirst({
      where: { id: appointmentTypeId, organizationId },
    });
    if (!apptType) {
      return NextResponse.json({ error: "Tipo de cita no encontrado" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + apptType.duration * 60000);

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        appointmentTypeId,
        status: { not: "CANCELLED" },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Este horario ya no está disponible." },
        { status: 409 }
      );
    }

    // Find or create contact
    let contactId: string | null = deal.contactId;
    if (!contactId) {
      let contact = await prisma.contact.findFirst({
        where: { email: guestEmail, organizationId },
      });
      if (!contact) {
        const nameParts = guestName.trim().split(" ");
        contact = await prisma.contact.create({
          data: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || null,
            email: guestEmail,
            phone: guestPhone || null,
            organizationId,
            source: `Deal: ${deal.title}`,
          },
        });
      }
      contactId = contact.id;
    }

    const appointment = await prisma.appointment.create({
      data: {
        appointmentTypeId,
        organizationId,
        contactId,
        dealId: id,
        startTime: start,
        endTime: end,
        timezone: "America/Mexico_City",
        status: "CONFIRMED",
        guestName,
        guestEmail,
        guestPhone: guestPhone || null,
        notes: notes || null,
        cancelToken: randomUUID(),
      },
      include: {
        appointmentType: { select: { id: true, name: true, duration: true, color: true } },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/[id]/appointments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — cancel an appointment
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id } = await params;

    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId es requerido" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, dealId: id, organizationId },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id]/appointments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
