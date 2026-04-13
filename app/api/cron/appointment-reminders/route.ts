import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import nodemailer from "nodemailer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date, tz: string) {
  return new Intl.DateTimeFormat("es-MX", {
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

async function sendReminderEmail(smtp: SmtpConfig, to: string, subject: string, html: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });
    await transporter.sendMail({ from: `"${smtp.senderName}" <${smtp.from}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("[appointment-reminders] Email error:", err);
    return false;
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildClientEmail(params: {
  guestName: string;
  typeName: string;
  formattedDate: string;
  duration: number;
  location?: string | null;
  timeLabel: string;
  urgency: "low" | "high"; // low = 1h, high = 10m/5m
}) {
  const locationRow = params.location
    ? `<tr><td style="padding:6px 0;color:#6b7280;width:110px">Ubicación</td><td style="padding:6px 0;font-weight:600">${params.location}</td></tr>`
    : "";
  const headerBg = params.urgency === "high" ? "#dc2626" : "#1d4ed8";
  const icon = params.urgency === "high" ? "🚨" : "⏰";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <div style="background:${headerBg};padding:20px 28px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">${icon} Recordatorio de cita</h2>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Tu cita es en <strong>${params.timeLabel}</strong></p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px;font-size:15px">Hola <strong>${params.guestName}</strong>, te recordamos tu próxima cita:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:110px">Tipo</td><td style="padding:6px 0;font-weight:600">${params.typeName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Fecha y hora</td><td style="padding:6px 0;font-weight:600;color:#059669">${params.formattedDate}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Duración</td><td style="padding:6px 0">${params.duration} minutos</td></tr>
          ${locationRow}
        </table>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">Si necesitas cancelar o reprogramar, por favor contáctanos.</p>
      </div>
    </div>`;
}

function buildOwnerEmail(params: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  typeName: string;
  formattedDate: string;
  duration: number;
  location?: string | null;
  notes?: string | null;
  timeLabel: string;
  urgency: "low" | "high";
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
  const headerBg = params.urgency === "high" ? "#7f1d1d" : "#1e3a5f";
  const icon = params.urgency === "high" ? "🚨" : "📅";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <div style="background:${headerBg};padding:20px 28px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">${icon} Cita en ${params.timeLabel}</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">${params.typeName}</p>
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderWindow = {
  label: "1h" | "10m" | "5m";
  timeLabel: string;   // display in email/WhatsApp
  urgency: "low" | "high";
  minMs: number;       // window start (ms from now)
  maxMs: number;       // window end   (ms from now)
  field: "reminderSent1h" | "reminderSent10m" | "reminderSent5m";
};

const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    label: "1h",
    timeLabel: "1 hora",
    urgency: "low",
    minMs: 55 * 60 * 1000,   // 55 min
    maxMs: 65 * 60 * 1000,   // 65 min
    field: "reminderSent1h",
  },
  {
    label: "10m",
    timeLabel: "10 minutos",
    urgency: "high",
    minMs: 7 * 60 * 1000,    // 7 min
    maxMs: 13 * 60 * 1000,   // 13 min
    field: "reminderSent10m",
  },
  {
    label: "5m",
    timeLabel: "5 minutos",
    urgency: "high",
    minMs: 2 * 60 * 1000,    // 2 min
    maxMs: 8 * 60 * 1000,    // 8 min
    field: "reminderSent5m",
  },
];

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results: Record<string, { processed: number; sent: number; errors: string[] }> = {};

    for (const window of REMINDER_WINDOWS) {
      const windowStart = new Date(now.getTime() + window.minMs);
      const windowEnd   = new Date(now.getTime() + window.maxMs);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: "CONFIRMED",
          [window.field]: false,
          startTime: { gte: windowStart, lte: windowEnd },
        },
        include: {
          appointmentType: {
            select: {
              name: true,
              duration: true,
              location: true,
              company: {
                select: {
                  name: true,
                  smtpHost: true, smtpPort: true, smtpUser: true,
                  smtpPass: true, smtpFromEmail: true, smtpSecure: true,
                },
              },
            },
          },
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

      let sent = 0;
      const errors: string[] = [];

      for (const appt of appointments) {
        try {
          const tz = appt.organization.timezone || "America/Cancun";
          const formattedDate = formatDateTime(appt.startTime, tz);
          const owner = appt.organization.members[0]?.user;
          const smtp = buildSmtpConfig(appt.appointmentType.company ?? null);

          // Email → cliente
          if (smtp && appt.guestEmail) {
            await sendReminderEmail(
              smtp,
              appt.guestEmail,
              `${window.urgency === "high" ? "🚨" : "⏰"} Tu cita "${appt.appointmentType.name}" es en ${window.timeLabel}`,
              buildClientEmail({
                guestName: appt.guestName,
                typeName: appt.appointmentType.name,
                formattedDate,
                duration: appt.appointmentType.duration,
                location: appt.appointmentType.location,
                timeLabel: window.timeLabel,
                urgency: window.urgency,
              })
            );
          }

          // Email → dueño
          if (smtp && owner?.email) {
            await sendReminderEmail(
              smtp,
              owner.email,
              `${window.urgency === "high" ? "🚨" : "📅"} Cita en ${window.timeLabel}: ${appt.guestName} — ${appt.appointmentType.name}`,
              buildOwnerEmail({
                guestName: appt.guestName,
                guestEmail: appt.guestEmail,
                guestPhone: appt.guestPhone,
                typeName: appt.appointmentType.name,
                formattedDate,
                duration: appt.appointmentType.duration,
                location: appt.appointmentType.location,
                notes: appt.notes,
                timeLabel: window.timeLabel,
                urgency: window.urgency,
              })
            );
          }

          // WhatsApp → dueño
          if (owner?.callMeBot?.phone && owner.callMeBot.apiKey) {
            const icon = window.urgency === "high" ? "🚨" : "📅";
            const msg =
              `${icon} *Cita en ${window.timeLabel} — ${appt.appointmentType.name}*\n` +
              `👤 ${appt.guestName}\n` +
              `📧 ${appt.guestEmail}\n` +
              (appt.guestPhone ? `📞 ${appt.guestPhone}\n` : "") +
              `🗓️ ${formattedDate}`;
            await sendWhatsAppNotification(owner.callMeBot.phone, owner.callMeBot.apiKey, msg);
          }

          // Marcar como enviado
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { [window.field]: true },
          });

          sent++;
        } catch (err) {
          console.error(`[appointment-reminders] ${window.label} error for ${appt.id}:`, err);
          errors.push(appt.id);
        }
      }

      results[window.label] = { processed: appointments.length, sent, errors };
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error("[appointment-reminders] Fatal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
