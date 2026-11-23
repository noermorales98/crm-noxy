import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { loadMonthMetrics } from "@/src/lib/month-metrics";

// GET /api/sales/months            → lista de meses con foto guardada
// GET /api/sales/months?month=YYYY-MM → métricas del mes (foto guardada; el mes en curso se calcula en vivo)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const month = new URL(req.url).searchParams.get("month");
    if (month) {
      const result = await loadMonthMetrics(organizationId, month);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }
    const rows = await prisma.monthlySnapshot.findMany({ where: { organizationId }, orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } });
    return NextResponse.json({ months: rows.map((row) => `${row.year}-${String(row.month).padStart(2, "0")}`) });
  } catch (error) {
    console.error("GET /api/sales/months error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
