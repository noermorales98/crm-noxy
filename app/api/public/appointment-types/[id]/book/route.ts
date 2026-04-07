import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { randomUUID } from "crypto";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { startTime, guestName, guestEmail, guestPhone, notes, timezone } = await req.json();

  if (!startTime || !guestName || !guestEmail) {
    return NextResponse.json(
      { error: "startTime, guestName and guestEmail are required" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id },
    include: { schedule: { include: { slots: true } } }
  });

  if (!appointmentType || !appointmentType.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders() });
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + appointmentType.duration * 60000);

  // Verify slot is not already booked
  const conflict = await prisma.appointment.findFirst({
    where: {
      appointmentTypeId: id,
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start }
    }
  });

  if (conflict) {
    return NextResponse.json(
      { error: "This time slot is no longer available." },
      { status: 409, headers: corsHeaders() }
    );
  }

  // Find or create contact
  let contact = await prisma.contact.findFirst({
    where: { email: guestEmail, organizationId: appointmentType.organizationId }
  });

  if (!contact) {
    const nameParts = guestName.trim().split(" ");
    contact = await prisma.contact.create({
      data: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || null,
        email: guestEmail,
        phone: guestPhone || null,
        organizationId: appointmentType.organizationId,
        source: `Appointment: ${appointmentType.name}`
      }
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      appointmentTypeId: id,
      organizationId: appointmentType.organizationId,
      contactId: contact.id,
      startTime: start,
      endTime: end,
      timezone: timezone || "America/Mexico_City",
      status: "CONFIRMED",
      guestName,
      guestEmail,
      guestPhone: guestPhone || null,
      notes: notes || null,
      cancelToken: randomUUID()
    }
  });

  // Create task for organization owner and send notifications
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: appointmentType.organizationId, role: "OWNER" },
    include: { user: { select: { callMeBot: true } } },
  });
  if (owner) {
    await prisma.task.create({
      data: {
        title: `Appointment: ${appointmentType.name} with ${guestName}`,
        description: `Scheduled for ${start.toLocaleString()}\n${notes || ""}`,
        dueDate: start,
        isCompleted: false,
        organizationId: appointmentType.organizationId,
        contactId: contact.id,
        assignedToId: owner.userId
      }
    });

    // WhatsApp notification via CallMeBot
    if (owner.user?.callMeBot?.phone && owner.user?.callMeBot?.apiKey) {
      const waMsg = [
        `📅 *Nueva cita agendada — ${appointmentType.name}*`,
        `👤 ${guestName}`,
        guestEmail ? `📧 ${guestEmail}` : null,
        guestPhone ? `📞 ${guestPhone}` : null,
        `🗓️ ${start.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}`,
        notes ? `📝 ${notes}` : null,
      ].filter(Boolean).join("\n");

      await sendWhatsAppNotification(
        owner.user.callMeBot.phone,
        owner.user.callMeBot.apiKey,
        waMsg
      ).catch(err => console.error("WhatsApp notification error:", err));
    }
  }

  return NextResponse.json(
    { success: true, appointmentId: appointment.id, cancelToken: appointment.cancelToken },
    { status: 201, headers: corsHeaders() }
  );
}
