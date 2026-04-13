import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import nodemailer from "nodemailer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date, tz: string, locale = "es-MX") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
  senderName: string;
}

function buildSmtpConfig(company: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromEmail?: string | null;
  smtpSecure?: boolean | null;
  name: string;
} | null): SmtpConfig | null {
  if (company?.smtpHost && company.smtpUser && company.smtpPass) {
    return {
      host: company.smtpHost,
      port: company.smtpPort ?? 465,
      secure: company.smtpSecure ?? true,
      auth: { user: company.smtpUser, pass: company.smtpPass },
      from: company.smtpFromEmail ?? company.smtpUser,
      senderName: company.name,
    };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "465"),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      from: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER,
      senderName: "Noxy",
    };
  }
  return null;
}

async function sendReminderEmail(
  smtp: SmtpConfig,
  to: string,
  subject: string,
  html: string
) {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });
    await transporter.sendMail({
      from: `"${smtp.senderName}" <${smtp.from}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[appointment-reminders] Email error:", err);
    return false;
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildClientReminderEmail(params: {
  guestName: string;
  typeName: string;
  formattedDate: string;
  duration: number;
  location?: string | null;
  timeLabel: string; // "24 horas" | "1 hora"
}) {
  const locationRow = params.location
    ? `<tr><td style="padding:6px 0;color:#6b7280;width:110px">Ubicación</td><td style="padding:6px 0;font-weight:600">${params.location}</td></tr>`
    : "";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <div style="background:#f3f4f6;padding:20px 28px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e7eb">
        <h2 style="color:#111827;margin:0;font-size:18px">⏰ Recordatorio de cita</h2>
        <p style="color:#6b7280;margin:4px 0 0;font-size:13px">Tu cita es en <strong>${params.timeLabel}</strong></p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px;font-size:15px">Hola <strong>${params.guestName}</strong>, te recordamos que tienes una cita próximamente:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:110px">Tipo</td><td style="padding:6px 0;font-weight:600">${params.typeName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Fecha y hora</td><td style="padding:6px 0;font-weight:600;color:#059669">${params.formattedDate}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Duración</td><td style="padding:6px 0">${params.duration} minutos</td></tr>
          ${locationRow}
        </table>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.</p>
      </div>
    </div>`;
}

function buildOwnerReminderEmail(params: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  typeName: string;
  formattedDate: string;
  duration: number;
  location?: string | null;
  notes?: string | null;
  timeLabel: string;
}) {
  const locationRow = params.location
    ? `<tr><td style="padding:6px 0;color:#6b7280;width:130px">Ubicación</td><td style="padding:6px 0">${params.location}</td></tr>`
    : "";
  const phoneRow = params.guestPhone
    ? `<tr><td style="padding:6px 0;color:#6b7280">Teléfono</td><td style="padding:6px 0">${params.guestPhone}</td></tr>`
    : "";
  const notesBlock = params.notes
    ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border-radius:8px"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Notas</p><p style="margin:0;font-size:13px;color:#374151">${params.notes}</p></div>`
    : "";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <div style="background:#1e3a5f;padding:20px 28px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">📅 Cita en ${params.timeLabel}</h2>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">${params.typeName}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:130px">Cliente</td><td style="padding:6px 0;font-weight:600">${params.guestName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${params.guestEmail}</td></tr>
          ${phoneRow}
          <tr><td style="padding:6px 0;color:#6b7280">Fecha y hora</td><td style="padding:6px 0;font-weight:600;color:#059669">${params.formattedDate}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Duración</td><td style="padding:6px 0">${params.duration} minutos</td></tr>
          ${locationRow}
        </table>
        ${notesBlock}
      </div>
    </div>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    // Validate cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Windows for 24h reminder: appointments starting between 23h30m and 24h30m from now
    const window24hStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const window24hEnd   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    // Windows for 1h reminder: appointments starting between 55m and 65m from now
    const window1hStart = new Date(now.getTime() + 55 * 60 * 1000);
    const window1hEnd   = new Date(now.getTime() + 65 * 60 * 1000);

    // Fetch appointments due for 24h reminder
    const appts24h = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent24h: false,
        startTime: { gte: window24hStart, lte: window24hEnd },
      },
      include: {
        appointmentType: { select: { name: true, duration: true, location: true, company: { select: { name: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpSecure: true } } } },
        organization: {
          select: {
            timezone: true,
            members: {
              where: { role: "OWNER" },
              include: { user: { select: { email: true, callMeBot: true } } },
              take: 1,
            },
          },
        },
      },
    });

    // Fetch appointments due for 1h reminder
    const appts1h = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent1h: false,
        startTime: { gte: window1hStart, lte: window1hEnd },
      },
      include: {
        appointmentType: { select: { name: true, duration: true, location: true, company: { select: { name: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpSecure: true } } } },
        organization: {
          select: {
            timezone: true,
            members: {
              where: { role: "OWNER" },
              include: { user: { select: { email: true, callMeBot: true } } },
              take: 1,
            },
          },
        },
      },
    });

    let sent24h = 0;
    let sent1h = 0;
    const errors: string[] = [];

    // ── Process 24h reminders ─────────────────────────────────────────────────
    for (const appt of appts24h) {
      try {
        const tz = appt.organization.timezone || "America/Cancun";
        const formattedDate = formatDateTime(appt.startTime, tz);
        const owner = appt.organization.members[0]?.user;
        const smtp = buildSmtpConfig(appt.appointmentType.company ?? null);
        const timeLabel = "24 horas";

        // Email to client
        if (smtp && appt.guestEmail) {
          await sendReminderEmail(
            smtp,
            appt.guestEmail,
            `⏰ Recordatorio: tu cita "${appt.appointmentType.name}" es mañana`,
            buildClientReminderEmail({
              guestName: appt.guestName,
              typeName: appt.appointmentType.name,
              formattedDate,
              duration: appt.appointmentType.duration,
              location: appt.appointmentType.location,
              timeLabel,
            })
          );
        }

        // Email to owner
        if (smtp && owner?.email) {
          await sendReminderEmail(
            smtp,
            owner.email,
            `📅 Cita mañana: ${appt.guestName} — ${appt.appointmentType.name}`,
            buildOwnerReminderEmail({
              guestName: appt.guestName,
              guestEmail: appt.guestEmail,
              guestPhone: appt.guestPhone,
              typeName: appt.appointmentType.name,
              formattedDate,
              duration: appt.appointmentType.duration,
              location: appt.appointmentType.location,
              notes: appt.notes,
              timeLabel,
            })
          );
        }

        // WhatsApp to owner
        if (owner?.callMeBot?.phone && owner.callMeBot.apiKey) {
          const msg =
            `📅 *Cita mañana — ${appt.appointmentType.name}*\n` +
            `👤 ${appt.guestName}\n` +
            `📧 ${appt.guestEmail}\n` +
            (appt.guestPhone ? `📞 ${appt.guestPhone}\n` : "") +
            `🗓️ ${formattedDate}`;
          await sendWhatsAppNotification(owner.callMeBot.phone, owner.callMeBot.apiKey, msg);
        }

        // Mark as sent
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent24h: true },
        });

        sent24h++;
      } catch (err) {
        console.error(`[appointment-reminders] 24h error for ${appt.id}:`, err);
        errors.push(appt.id);
      }
    }

    // ── Process 1h reminders ──────────────────────────────────────────────────
    for (const appt of appts1h) {
      try {
        const tz = appt.organization.timezone || "America/Cancun";
        const formattedDate = formatDateTime(appt.startTime, tz);
        const owner = appt.organization.members[0]?.user;
        const smtp = buildSmtpConfig(appt.appointmentType.company ?? null);
        const timeLabel = "1 hora";

        // Email to client
        if (smtp && appt.guestEmail) {
          await sendReminderEmail(
            smtp,
            appt.guestEmail,
            `⏰ Recordatorio: tu cita "${appt.appointmentType.name}" es en 1 hora`,
            buildClientReminderEmail({
              guestName: appt.guestName,
              typeName: appt.appointmentType.name,
              formattedDate,
              duration: appt.appointmentType.duration,
              location: appt.appointmentType.location,
              timeLabel,
            })
          );
        }

        // Email to owner
        if (smtp && owner?.email) {
          await sendReminderEmail(
            smtp,
            owner.email,
            `⚡ Cita en 1 hora: ${appt.guestName} — ${appt.appointmentType.name}`,
            buildOwnerReminderEmail({
              guestName: appt.guestName,
              guestEmail: appt.guestEmail,
              guestPhone: appt.guestPhone,
              typeName: appt.appointmentType.name,
              formattedDate,
              duration: appt.appointmentType.duration,
              location: appt.appointmentType.location,
              notes: appt.notes,
              timeLabel,
            })
          );
        }

        // WhatsApp to owner
        if (owner?.callMeBot?.phone && owner.callMeBot.apiKey) {
          const msg =
            `⚡ *Cita en 1 hora — ${appt.appointmentType.name}*\n` +
            `👤 ${appt.guestName}\n` +
            `📧 ${appt.guestEmail}\n` +
            (appt.guestPhone ? `📞 ${appt.guestPhone}\n` : "") +
            `🗓️ ${formattedDate}`;
          await sendWhatsAppNotification(owner.callMeBot.phone, owner.callMeBot.apiKey, msg);
        }

        // Mark as sent
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent1h: true },
        });

        sent1h++;
      } catch (err) {
        console.error(`[appointment-reminders] 1h error for ${appt.id}:`, err);
        errors.push(appt.id);
      }
    }

    return NextResponse.json({
      ok: true,
      processed24h: appts24h.length,
      sent24h,
      processed1h: appts1h.length,
      sent1h,
      errors,
    });
  } catch (error) {
    console.error("[appointment-reminders] Fatal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
