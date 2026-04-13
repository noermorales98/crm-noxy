import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET() {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId as string | undefined;

  if (!session?.user || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await prisma.googleCalendarToken.findUnique({
    where: { organizationId },
    select: { id: true, calendarId: true, createdAt: true },
  });

  const configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return NextResponse.json({
    connected: !!token,
    configured,
    calendarId: token?.calendarId ?? "primary",
    connectedAt: token?.createdAt ?? null,
  });
}
