import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

/**
 * Converts a "HH:MM" time on a given date to a UTC Date,
 * interpreting that time as being in the given IANA timezone.
 */
function localTimeToUTC(dateStr: string, timeStr: string, tz: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  const approxDate = new Date(Date.UTC(year, month - 1, day, h, m));
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
  const tzDate = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  const offset = approxDate.getTime() - tzDate;
  return new Date(approxDate.getTime() + offset);
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const blocked = await prisma.blockedTime.findMany({
      where: { organizationId },
      orderBy: { start: "asc" }
    });

    return NextResponse.json(blocked);
  } catch (error: any) {
    console.error("GET BlockedTime Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const { title, date, startTime, endTime, allDay } = await req.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Get org timezone
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const tz = org?.timezone || "America/Cancun";

    let startDt: Date;
    let endDt: Date;

    if (allDay) {
      startDt = localTimeToUTC(date, "00:00", tz);
      // End of day: set seconds to 59 manually after conversion
      endDt = localTimeToUTC(date, "23:59", tz);
      endDt = new Date(endDt.getTime() + 59 * 1000);
    } else {
      if (!startTime || !endTime) {
        return NextResponse.json({ error: "Start and end times are required for hour blocks" }, { status: 400 });
      }
      startDt = localTimeToUTC(date, startTime, tz);
      endDt = localTimeToUTC(date, endTime, tz);
    }

    if (endDt <= startDt) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const blocked = await prisma.blockedTime.create({
      data: {
        title: title || "Ocupado",
        start: startDt,
        end: endDt,
        organizationId
      }
    });

    return NextResponse.json(blocked, { status: 201 });
  } catch (error: any) {
    console.error("POST BlockedTime Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
