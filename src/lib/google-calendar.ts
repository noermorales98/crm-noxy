import { google } from "googleapis";
import { prisma } from "@/src/lib/db";

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl() {
  const oauth2Client = getGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  });
}

export async function getCalendarClient(organizationId: string) {
  const token = await prisma.googleCalendarToken.findUnique({
    where: { organizationId },
  });
  if (!token) return null;

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiresAt?.getTime(),
  });

  // Persist refreshed tokens automatically
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.googleCalendarToken.update({
      where: { organizationId },
      data: {
        accessToken: tokens.access_token ?? token.accessToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return { calendar, calendarId: token.calendarId };
}

export interface AppointmentForSync {
  id: string;
  startTime: Date;
  endTime: Date;
  guestName: string;
  guestEmail: string;
  notes?: string | null;
  googleEventId?: string | null;
  appointmentType: { name: string; location?: string | null };
}

export async function syncAppointmentToCalendar(
  organizationId: string,
  appointment: AppointmentForSync
): Promise<string | null> {
  const client = await getCalendarClient(organizationId);
  if (!client) return null;

  const { calendar, calendarId } = client;

  const eventBody = {
    summary: `${appointment.appointmentType.name} — ${appointment.guestName}`,
    description: appointment.notes ?? "",
    location: appointment.appointmentType.location ?? undefined,
    start: { dateTime: appointment.startTime.toISOString() },
    end: { dateTime: appointment.endTime.toISOString() },
    attendees: [
      { email: appointment.guestEmail, displayName: appointment.guestName },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email" as const, minutes: 24 * 60 },
        { method: "popup" as const, minutes: 60 },
      ],
    },
  };

  try {
    if (appointment.googleEventId) {
      const res = await calendar.events.update({
        calendarId,
        eventId: appointment.googleEventId,
        requestBody: eventBody,
      });
      return res.data.id ?? null;
    } else {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
      });
      return res.data.id ?? null;
    }
  } catch (err) {
    console.error("[google-calendar] Failed to sync event:", err);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(
  organizationId: string,
  eventId: string
): Promise<void> {
  const client = await getCalendarClient(organizationId);
  if (!client) return;

  const { calendar, calendarId } = client;
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (err) {
    console.error("[google-calendar] Failed to delete event:", err);
  }
}

export interface CalendarEventSummary {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string | null;
  htmlLink?: string | null;
}

function parseEventDate(
  start?: { dateTime?: string | null; date?: string | null },
  end?: { dateTime?: string | null; date?: string | null }
): { start: Date; end: Date } | null {
  if (start?.dateTime) {
    const startDate = new Date(start.dateTime);
    const endDate = end?.dateTime ? new Date(end.dateTime) : startDate;
    return { start: startDate, end: endDate };
  }
  if (start?.date) {
    const startDate = new Date(`${start.date}T00:00:00`);
    const endDate = end?.date ? new Date(`${end.date}T00:00:00`) : startDate;
    return { start: startDate, end: endDate };
  }
  return null;
}

export async function listGoogleCalendarEvents(
  organizationId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEventSummary[]> {
  const client = await getCalendarClient(organizationId);
  if (!client) return [];

  const { calendar, calendarId } = client;
  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const items = res.data.items ?? [];
    const events: CalendarEventSummary[] = [];

    for (const item of items) {
      if (!item.id) continue;
      const dates = parseEventDate(item.start, item.end);
      if (!dates) continue;
      events.push({
        id: item.id,
        summary: item.summary ?? "(Sin título)",
        start: dates.start,
        end: dates.end,
        location: item.location ?? null,
        htmlLink: item.htmlLink ?? null,
      });
    }

    return events;
  } catch (err) {
    console.error("[google-calendar] Failed to list events:", err);
    return [];
  }
}
