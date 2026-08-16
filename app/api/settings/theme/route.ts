import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { resolveCrmTheme } from "@/src/lib/crm-themes";
import { parseCrmThemePatch } from "@/src/lib/crm-theme-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { crmTheme: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ theme: resolveCrmTheme(user.crmTheme).id });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = parseCrmThemePatch(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { crmTheme: parsed.theme },
  });

  return NextResponse.json({ theme: parsed.theme });
}
