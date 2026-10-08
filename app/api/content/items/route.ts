import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));

  const items = await prisma.contentItem.findMany({
    where: { organizationId: orgId, date: { gte: from, lt: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      client: { select: { id: true, name: true, kind: true, color: true } },
      editorNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(items);
}
