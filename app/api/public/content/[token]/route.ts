import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

// GET /api/public/content/[token] — datos del calendario público de un cliente/marca
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await prisma.contentClient.findFirst({
    where: { publicToken: token, isActive: true },
    select: { id: true, name: true, kind: true, description: true },
  });
  if (!client) return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  let where: any = { clientId: client.id };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }

  const items = await prisma.contentItem.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, date: true, type: true, title: true, time: true,
      hook: true, hooksAlt: true, script: true, caption: true,
      cta: true, tips: true, note: true,
    },
  });

  return NextResponse.json({ client, items });
}
