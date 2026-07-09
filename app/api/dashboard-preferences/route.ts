import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { WIDGET_MAP, DEFAULT_WIDGETS } from "@/src/lib/dashboardWidgets";
import { TAB_MAP, DEFAULT_TABS } from "@/src/lib/dashboardTabs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pref = await prisma.dashboardPreference.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: session.currentOrganizationId } },
  });

  return NextResponse.json({
    widgets: (pref?.widgets as string[] | undefined) ?? DEFAULT_WIDGETS,
    tabs: (pref?.tabs as string[] | undefined) ?? DEFAULT_TABS,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { widgets, tabs } = body as { widgets?: unknown; tabs?: unknown };

  if (widgets !== undefined) {
    if (!Array.isArray(widgets) || widgets.some((id) => typeof id !== "string" || !WIDGET_MAP[id])) {
      return NextResponse.json({ error: "Lista de widgets inválida" }, { status: 400 });
    }
  }
  if (tabs !== undefined) {
    if (!Array.isArray(tabs) || tabs.some((id) => typeof id !== "string" || !TAB_MAP[id])) {
      return NextResponse.json({ error: "Lista de pestañas inválida" }, { status: 400 });
    }
  }

  const userId = session.user.id;
  const organizationId = session.currentOrganizationId;
  const existing = await prisma.dashboardPreference.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });

  const nextWidgets = widgets !== undefined ? widgets : (existing?.widgets as string[] | undefined) ?? DEFAULT_WIDGETS;
  const nextTabs = tabs !== undefined ? tabs : (existing?.tabs as string[] | undefined) ?? DEFAULT_TABS;

  const saved = await prisma.dashboardPreference.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { widgets: nextWidgets, tabs: nextTabs },
    create: { userId, organizationId, widgets: nextWidgets, tabs: nextTabs },
  });

  return NextResponse.json({ widgets: saved.widgets, tabs: saved.tabs });
}
