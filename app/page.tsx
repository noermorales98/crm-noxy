import { DashboardCustomizer } from "@/src/components/dashboard/DashboardCustomizer";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { redirect } from "next/navigation";
import { WIDGET_MAP, DEFAULT_WIDGETS } from "@/src/lib/dashboardWidgets";
import { TAB_MAP, DEFAULT_TABS } from "@/src/lib/dashboardTabs";
import { fetchDashboardData, type DataKey } from "@/src/lib/dashboardData";

export default async function Home() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    redirect("/login");
  }

  const organizationId = session.currentOrganizationId;
  const userId = session.user.id;
  const now = new Date();

  const preference = await prisma.dashboardPreference.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });

  const widgetIds = ((preference?.widgets as string[] | undefined) ?? DEFAULT_WIDGETS).filter((id) => WIDGET_MAP[id]);
  const tabIds = ((preference?.tabs as string[] | undefined) ?? DEFAULT_TABS).filter((id) => TAB_MAP[id]);

  const requiredKeys: DataKey[] = [
    ...widgetIds.flatMap((id) => WIDGET_MAP[id].dataKeys),
    ...tabIds.map((id) => TAB_MAP[id].dataKey),
  ];

  const data = await fetchDashboardData(requiredKeys, organizationId, now);

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5 bg-surface-app">
      <DashboardCustomizer initialWidgets={widgetIds} initialTabs={tabIds} data={data} />
    </main>
  );
}
