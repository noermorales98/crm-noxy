import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardCustomizer } from "@/src/components/dashboard/DashboardCustomizer";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";
import HomeDashboardShell from "@/src/components/HomeDashboardShell";
import LandingPage, { LANDING_DESCRIPTION, LANDING_TITLE } from "@/src/components/landing/LandingPage";
import { auth } from "@/auth";
import { isDbUnavailableError, withDbFallback } from "@/src/lib/db";
import { WIDGET_MAP, DEFAULT_WIDGETS } from "@/src/lib/dashboardWidgets";
import { TAB_MAP, DEFAULT_TABS } from "@/src/lib/dashboardTabs";
import { fetchDashboardData, type DashboardData, type DataKey } from "@/src/lib/dashboardData";
import { prisma } from "@/src/lib/db";
import { firstAllowedPath, hasPermission } from "@/src/lib/permissions";

const EMPTY_DASHBOARD: DashboardData = {};

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return {
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        type: "website",
        locale: "es_MX",
        siteName: "Noxy CRM",
      },
      twitter: { card: "summary", title: LANDING_TITLE, description: LANDING_DESCRIPTION },
    };
  }
  return {
    title: "Noxy CRM - Gestión de Clientes",
    description: "Gestión de Clientes",
  };
}

export default async function Home() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return <LandingPage />;
  }

  const role = session.role;
  const permissions = session.permissions;
  if (!hasPermission(role, permissions, "crm")) {
    redirect(firstAllowedPath(role, permissions));
  }

  const organizationId = session.currentOrganizationId;
  const userId = session.user.id;
  const now = new Date();

  const preferenceResult = await withDbFallback(
    `dashboard-pref:${userId}:${organizationId}`,
    () =>
      prisma.dashboardPreference.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      }),
    null,
  );

  const preference = preferenceResult.data;
  const widgetIds = ((preference?.widgets as string[] | undefined) ?? DEFAULT_WIDGETS).filter(
    (id) => WIDGET_MAP[id],
  );
  const tabIds = ((preference?.tabs as string[] | undefined) ?? DEFAULT_TABS).filter(
    (id) => TAB_MAP[id],
  );

  const requiredKeys: DataKey[] = [
    ...widgetIds.flatMap((id) => WIDGET_MAP[id].dataKeys),
    ...tabIds.map((id) => TAB_MAP[id].dataKey),
  ];

  let data: DashboardData = EMPTY_DASHBOARD;
  let dbDegraded = preferenceResult.dbError;
  let stale = preferenceResult.stale;

  try {
    const dash = await withDbFallback(
      `dashboard-data:${organizationId}:${requiredKeys.slice().sort().join(",")}`,
      () => fetchDashboardData(requiredKeys, organizationId, now),
      EMPTY_DASHBOARD,
    );
    data = dash.data;
    dbDegraded = dbDegraded || dash.dbError;
    stale = stale || dash.stale;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    dbDegraded = true;
  }

  return (
    <HomeDashboardShell>
      <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden lg:gap-5 overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
        {dbDegraded && <DbUnavailableNotice stale={stale} compact />}
        <DashboardCustomizer initialWidgets={widgetIds} initialTabs={tabIds} data={data} />
      </main>
    </HomeDashboardShell>
  );
}
