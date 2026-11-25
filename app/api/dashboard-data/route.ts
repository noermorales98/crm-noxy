import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DATA_FETCHERS, fetchDashboardData, type DataKey } from "@/src/lib/dashboardData";
import { hasPermission } from "@/src/lib/permissions";

/** Datos de widgets sueltos: el selector del inicio los pide para previsualizar un widget antes de agregarlo. */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = session.currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });
    if (!hasPermission(session.role, session.permissions, "crm")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const raw = new URL(req.url).searchParams.get("keys") ?? "";
    const keys = raw
      .split(",")
      .map((key) => key.trim())
      .filter((key): key is DataKey => Object.hasOwn(DATA_FETCHERS, key));
    if (keys.length === 0) return NextResponse.json({ error: "keys es requerido" }, { status: 400 });
    if (keys.length > 12) return NextResponse.json({ error: "Demasiadas claves" }, { status: 400 });

    const data = await fetchDashboardData(keys, organizationId, new Date());
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/dashboard-data error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
