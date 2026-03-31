import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

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

    const { title, start, end } = await req.json();
    
    if (!start || !end) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }

    const startDt = new Date(start);
    const endDt = new Date(end);

    if (endDt <= startDt) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
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
