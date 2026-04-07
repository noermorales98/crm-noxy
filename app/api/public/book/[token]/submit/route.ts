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

// POST — book an appointment through a deal booking link
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { appointmentTypeId, startTime, guestName, guestEmail, guestPhone, notes, timezone } = await req.json();

    if (!appointmentTypeId || !startTime || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: "appointmentTypeId, startTime, guestName y guestEmail son requeridos" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Resolve deal
    const deal = await prisma.deal.findUnique({
      where: { bookingToken: token },
      select: { id: true, organizationId: true, contactId: true, title: true },
    });

    if (!deal) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404, headers: corsHeaders() });
    }

    // Validate appointment type belongs to same org
    const apptType = await prisma.appointmentType.findFirst({
      where: { id: appointmentTypeId, organizationId: deal.organizationId, isActive: true },
    });
    if (!apptType) {
      return NextResponse.json({ error: "Tipo de cita no válido" }, { status: 404, headers: corsHeaders() });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + apptType.duration * 60000);

    // Check conflicts
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
        { status: 409, headers: corsHeaders() }
      );
    }

    // Find or create contact
    let contactId: string | null = deal.contactId;
    if (!contactId) {
      let contact = await prisma.contact.findFirst({
        where: { email: guestEmail, organizationId: deal.organizationId },
      });
      if (!contact) {
        const nameParts = guestName.trim().split(" ");
        contact = await prisma.contact.create({
          data: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || null,
            email: guestEmail,
            phone: guestPhone || null,
            organizationId: deal.organizationId,
            source: `Booking: ${deal.title}`,
          },
        });
      }
      contactId = contact.id;

      // Also link contact to deal if none was linked
      await prisma.deal.update({
        where: { id: deal.id },
        data: { contactId },
      });
    }

    // Create appointment linked to the deal
    const appointment = await prisma.appointment.create({
      data: {
        appointmentTypeId,
        organizationId: deal.organizationId,
        contactId,
        dealId: deal.id,
        startTime: start,
        endTime: end,
        timezone: timezone || "America/Mexico_City",
        status: "CONFIRMED",
        guestName,
        guestEmail,
        guestPhone: guestPhone || null,
        notes: notes || null,
        cancelToken: randomUUID(),
      },
    });

    // Create task for owner and send notifications
    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, role: "OWNER" },
      include: { user: { select: { callMeBot: true } } },
    });
    if (owner) {
      await prisma.task.create({
        data: {
          title: `Cita: ${apptType.name} — ${guestName}`,
          description: `Deal: ${deal.title}\nFecha: ${start.toLocaleString()}\n${notes || ""}`,
          dueDate: start,
          isCompleted: false,
          organizationId: deal.organizationId,
          contactId,
          assignedToId: owner.userId,
        },
      });

      // WhatsApp notification via CallMeBot
      if (owner.user?.callMeBot?.phone && owner.user?.callMeBot?.apiKey) {
        const waMsg = [
          `📅 *Nueva cita agendada — ${apptType.name}*`,
          `👤 ${guestName}`,
          guestEmail ? `📧 ${guestEmail}` : null,
          guestPhone ? `📞 ${guestPhone}` : null,
          `🗓️ ${start.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}`,
          deal.title ? `📁 Deal: ${deal.title}` : null,
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
      { success: true, appointmentId: appointment.id },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("POST /api/public/book/[token]/submit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders() });
  }
}
