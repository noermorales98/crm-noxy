import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { randomUUID } from "crypto";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import nodemailer from "nodemailer";

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

function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(params: {
  startTime: string; endTime: string; title: string;
  location?: string; guestEmail: string; uid: string;
}) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM Noxy//Appointment//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `DTSTART:${toIcsDate(params.startTime)}`,
    `DTEND:${toIcsDate(params.endTime)}`,
    `SUMMARY:${params.title}`,
    params.location ? `LOCATION:${params.location}` : null,
    `ORGANIZER:mailto:${params.guestEmail}`,
    `ATTENDEE;RSVP=FALSE:mailto:${params.guestEmail}`,
    `UID:${params.uid}@crm-noxy`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function buildGoogleCalendarUrl(startIso: string, endIso: string, title: string, timezone: string, location?: string) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toIcsDate(startIso)}/${toIcsDate(endIso)}`,
    ctz: timezone,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
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
    include: {
      schedule: { include: { slots: true } },
      company: {
        select: { id: true, name: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpSecure: true },
      },
    },
  });

  if (!appointmentType || !appointmentType.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders() });
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + appointmentType.duration * 60000);

  // Check conflicts across all appointment types sharing the same schedule
  const conflict = await prisma.appointment.findFirst({
    where: {
      appointmentType: { scheduleId: appointmentType.scheduleId },
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

  // ── Send confirmation email to guest ─────────────────────────────────────
  const apptTz = timezone || "America/Mexico_City";
  const googleCalUrl = buildGoogleCalendarUrl(
    appointment.startTime.toISOString(),
    appointment.endTime.toISOString(),
    appointmentType.name,
    apptTz,
    appointmentType.location || undefined,
  );
  const icsContent = buildIcs({
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    title: appointmentType.name,
    location: appointmentType.location || undefined,
    guestEmail,
    uid: appointment.id,
  });
  const formattedStart = appointment.startTime.toLocaleString("es-MX", {
    dateStyle: "full", timeStyle: "short", timeZone: apptTz,
  });

  // SMTP priority: 1) company linked to appt type, 2) any org company with SMTP, 3) env vars
  const typeCompany = appointmentType.company?.smtpHost ? appointmentType.company : null;
  const fallbackCompany = typeCompany
    ? null
    : await prisma.company.findFirst({
        where: { organizationId: appointmentType.organizationId, smtpHost: { not: null }, smtpUser: { not: null }, smtpPass: { not: null } },
        select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpSecure: true, name: true },
      });

  const smtpSource = typeCompany || fallbackCompany;
  const smtpConfig = smtpSource?.smtpHost
    ? { host: smtpSource.smtpHost!, port: smtpSource.smtpPort || 465, secure: smtpSource.smtpSecure ?? true, auth: { user: smtpSource.smtpUser!, pass: smtpSource.smtpPass! }, from: smtpSource.smtpFromEmail || smtpSource.smtpUser!, name: smtpSource.name || "Noxy" }
    : process.env.SMTP_HOST && process.env.SMTP_USER
      ? { host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "465"), secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465", auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }, from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!, name: "Noxy" }
      : null;

  if (smtpConfig) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
      });

      const locationHtml = appointmentType.location
        ? `<tr><td style="padding:6px 0;color:#6b7280;width:110px">Ubicación</td><td style="padding:6px 0;font-weight:600">${appointmentType.location}</td></tr>`
        : "";

      await transporter.sendMail({
        from: `"${smtpConfig.name}" <${smtpConfig.from}>`,
        to: guestEmail,
        subject: `✅ Cita confirmada: ${appointmentType.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <div style="background:#f3f4f6;padding:20px 28px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e7eb">
              <h2 style="color:#111827;margin:0;font-size:18px">✅ ¡Tu cita está confirmada!</h2>
              <p style="color:#6b7280;margin:4px 0 0;font-size:13px">${appointmentType.name}</p>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:6px 0;color:#6b7280;width:110px">Nombre</td><td style="padding:6px 0;font-weight:600">${guestName}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280">Fecha y hora</td><td style="padding:6px 0;font-weight:600;color:#059669">${formattedStart}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280">Duración</td><td style="padding:6px 0">${appointmentType.duration} minutos</td></tr>
                ${locationHtml}
              </table>

              <div style="margin-top:24px">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em">Agregar a mi calendario</p>
                <div style="display:flex;gap:10px">
                  <a href="${googleCalUrl}" target="_blank" style="display:inline-block;padding:10px 18px;background:#4285f4;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">Google Calendar</a>
                </div>
                <p style="margin-top:10px;font-size:12px;color:#6b7280">📎 Este correo incluye el archivo <strong>cita.ics</strong> adjunto — ábrelo para agregar la cita directamente a Apple Calendar, Outlook o cualquier app de calendario.</p>
              </div>

              ${notes ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border-radius:8px"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Notas</p><p style="margin:0;font-size:13px;color:#374151">${notes}</p></div>` : ""}
              <p style="margin-top:24px;font-size:12px;color:#9ca3af">Si necesitas cancelar o reprogramar, contacta directamente.</p>
            </div>
          </div>
        `,
        attachments: [
          { filename: "cita.ics", content: icsContent, contentType: "text/calendar;charset=utf-8;method=REQUEST" },
        ],
      });
    } catch (err) {
      console.error("Confirmation email error:", err);
    }
  }

  // ── Owner notifications ───────────────────────────────────────────────────
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: appointmentType.organizationId, role: "OWNER" },
    include: { user: { select: { callMeBot: true } } },
  });

  if (owner) {
    await prisma.task.create({
      data: {
        title: `Cita: ${appointmentType.name} — ${guestName}`,
        description: `Fecha: ${start.toLocaleString()}\n${notes || ""}`,
        dueDate: start,
        isCompleted: false,
        organizationId: appointmentType.organizationId,
        contactId: contact.id,
        assignedToId: owner.userId,
      },
    });

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
    {
      success: true,
      appointmentId: appointment.id,
      cancelToken: appointment.cancelToken,
      appointment: {
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        timezone: apptTz,
        typeName: appointmentType.name,
        location: appointmentType.location || "",
        guestEmail: appointment.guestEmail,
      },
    },
    { status: 201, headers: corsHeaders() }
  );
}
