import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gatherClientReport, saveReportDoc } from "@/src/lib/client-report-service";
import { previousMonth, renderClientReport } from "@/src/lib/client-report";

// Informe mensual de un cliente de la agencia. `save: true` lo guarda además como un doc nuevo.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const orgId = session?.currentOrganizationId;
  if (!session?.user?.id || !orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { month?: unknown; year?: unknown; save?: unknown; contentClientId?: unknown };
  const fallback = previousMonth(new Date());
  const month = Number(body.month ?? fallback.month);
  const year = Number(body.year ?? fallback.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Mes o año no válidos." }, { status: 400 });
  }

  const data = await gatherClientReport(orgId, id, { year, month }, typeof body.contentClientId === "string" ? body.contentClientId : null);
  if (!data) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  const markdown = renderClientReport(data);
  const docId = body.save === true ? await saveReportDoc(orgId, data, markdown) : null;
  return NextResponse.json({ markdown, docId });
}
