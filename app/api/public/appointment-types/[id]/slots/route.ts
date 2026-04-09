import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Converts a "HH:MM" time on a given date to a UTC Date,
 * interpreting that time as being in the given IANA timezone.
 */
function localTimeToUTC(year: number, month: number, day: number, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  // Build an ISO-like string that we ask Intl to parse in the target tz
  // Strategy: format a reference date in the target tz, find the UTC offset, apply it
  const approxDate = new Date(Date.UTC(year, month - 1, day, h, m));
  // Get the UTC offset for this tz at this approximate moment
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(approxDate);
  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  // Difference between what the tz says and what UTC says
  const tzDate = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  const offset = approxDate.getTime() - tzDate;
  return new Date(approxDate.getTime() + offset);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD (in the guest's calendar view)
  const guestTz = searchParams.get("tz") || "America/Mexico_City";

  if (!dateStr) {
    return NextResponse.json({ error: "date param required" }, { status: 400, headers: corsHeaders() });
  }

  try {
    // Validate tz
    Intl.DateTimeFormat(undefined, { timeZone: guestTz });
  } catch {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400, headers: corsHeaders() });
  }

  const appointmentType = await prisma.appointmentType.findUnique({
    where: { id },
    include: { schedule: { include: { slots: true } } }
  });

  if (!appointmentType || !appointmentType.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders() });
  }

  const scheduleTz = appointmentType.schedule.timezone || "America/Mexico_City";
  const [year, month, day] = dateStr.split("-").map(Number);

  // Determine day-of-week in the guest's timezone for the selected calendar date
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const dayAvailability = appointmentType.schedule.slots.find(
    s => s.dayOfWeek === dayOfWeek && s.isAvailable
  );

  // Build list of availability windows for this date
  // (regular schedule + any extended availability entries)
  const windows: { startTime: string; endTime: string }[] = [];

  if (dayAvailability) {
    windows.push({ startTime: dayAvailability.startTime, endTime: dayAvailability.endTime });
  }

  // Check for extended availability entries for this specific date
  // We use UTC to avoid timezone shifts when comparing with stored "date only" records
  const dateStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dateEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  const extendedEntries = await prisma.extendedAvailability.findMany({
    where: {
      organizationId: appointmentType.organizationId,
      date: { gte: dateStart, lte: dateEnd },
    },
  });

  for (const ext of extendedEntries) {
    windows.push({ startTime: ext.startTime, endTime: ext.endTime });
  }

  if (windows.length === 0) {
    return NextResponse.json({ slots: [] }, { headers: corsHeaders() });
  }

  // Compute the overall search range for existing appointments / blocked times
  const allWindowStarts = windows.map(w => localTimeToUTC(year, month, day, w.startTime, scheduleTz));
  const allWindowEnds = windows.map(w => localTimeToUTC(year, month, day, w.endTime, scheduleTz));
  const earliestStart = new Date(Math.min(...allWindowStarts.map(d => d.getTime())));
  const latestEnd = new Date(Math.max(...allWindowEnds.map(d => d.getTime())));

  // Fetch existing appointments in a wider window (±1 day to account for tz shifts)
  const searchStart = new Date(earliestStart.getTime() - 86400000);
  const searchEnd   = new Date(latestEnd.getTime()   + 86400000);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      appointmentType: { scheduleId: appointmentType.scheduleId },
      status: { not: "CANCELLED" },
      startTime: { gte: searchStart, lte: searchEnd }
    }
  });

  // Fetch blocked times inside the window
  const blockedTimes = await prisma.blockedTime.findMany({
    where: {
      organizationId: appointmentType.organizationId,
      start: { lte: searchEnd },
      end: { gte: searchStart }
    }
  });

  const duration  = appointmentType.duration * 60000;  // ms
  const buffer    = appointmentType.bufferAfter * 60000; // ms
  const now       = new Date();
  const slots: string[] = [];

  // Generate slots from each availability window
  for (const window of windows) {
    const windowStart = localTimeToUTC(year, month, day, window.startTime, scheduleTz);
    const windowEnd   = localTimeToUTC(year, month, day, window.endTime,   scheduleTz);

    let cursor = windowStart.getTime();
    const end  = windowEnd.getTime();

    while (cursor + duration <= end) {
      const slotStart = new Date(cursor);

      if (slotStart > now) {
        const overlapsAppt = existingAppointments.some(appt => {
          const aStart = new Date(appt.startTime).getTime();
          const aEnd   = new Date(appt.endTime).getTime();
          return cursor < aEnd && (cursor + duration) > aStart;
        });

        const overlapsBlocked = blockedTimes.some((block: any) => {
          const bStart = new Date(block.start).getTime();
          const bEnd   = new Date(block.end).getTime();
          return cursor < bEnd && (cursor + duration) > bStart;
        });

        if (!overlapsAppt && !overlapsBlocked) {
          slots.push(slotStart.toISOString());
        }
      }

      cursor += duration + buffer;
    }
  }

  // Deduplicate and sort
  const uniqueSlots = [...new Set(slots)].sort();

  return NextResponse.json({ slots: uniqueSlots }, { headers: corsHeaders() });
}
