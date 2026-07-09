import { prisma } from "@/src/lib/db";
import { listGoogleCalendarEvents } from "@/src/lib/google-calendar";
import type { Appointment, AppointmentType, Contact, Task, EmailCampaign, Project, ActivityLog } from "@prisma/client";

export interface DealsByStageEntry {
  stageId: string;
  name: string;
  color: string;
  count: number;
  value: number;
}

export interface FollowUpDeal {
  id: string;
  title: string;
  followUpAt: string;
  contact: { firstName: string; lastName: string | null } | null;
}

export interface RecentPaymentEntry {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  receivedAt: Date | null;
  source: "deal" | "client";
  label: string;
}

export interface ClientPaymentStats {
  mrr: number;
  pendingCount: number;
}

export interface ClientPaymentRow {
  id: string;
  name: string;
  monthlyFee: number;
  currency: string;
  billingDay: number;
  isPaid: boolean;
  receivedAt: string | null;
}

export interface GoogleCalendarData {
  connected: boolean;
  events: {
    id: string;
    summary: string;
    start: string;
    end: string;
    location: string | null;
    htmlLink: string | null;
  }[];
}

export interface RecentDealEntry {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  createdAt: Date;
  stage: { name: string; color: string };
  contact: { firstName: string; lastName: string | null } | null;
}

export interface RecentActivityEntry extends Pick<ActivityLog, "id" | "type" | "description" | "createdAt"> {
  createdBy: { name: string | null } | null;
  deal: { title: string } | null;
}

/** Every piece of data any dashboard widget or tab can render. All optional: only populated when a fetcher for that key actually ran. */
export interface DashboardData {
  contactsCount?: number;
  newContactsCount?: number;
  upcomingAppointmentsCount?: number;
  pendingTasksCount?: number;
  campaignsCount?: number;
  projectsCount?: number;
  pipelineValue?: number;
  dealStats?: { closingRate: number };
  revenueThisMonth?: number;
  pendingPaymentsValue?: number;
  vaultClientsCount?: number;
  latestContacts?: Contact[];
  upcomingAppointments?: (Appointment & { appointmentType: AppointmentType })[];
  pendingTasks?: Task[];
  dealsByStage?: DealsByStageEntry[];
  latestCampaigns?: EmailCampaign[];
  recentProjects?: Project[];
  recentPayments?: RecentPaymentEntry[];
  followUpDeals?: FollowUpDeal[];
  recentActivity?: RecentActivityEntry[];
  recentDeals?: RecentDealEntry[];
  clientPaymentStats?: ClientPaymentStats;
  clientPaymentsList?: ClientPaymentRow[];
  googleCalendar?: GoogleCalendarData;
}

export type DataKey = keyof DashboardData;

/** Active recurring clients (billed via /pipeline "Clientes") plus their payment record for the given month, if any. */
async function getActiveClientsWithCurrentPayment(organizationId: string, month: number, year: number) {
  const clients = await prisma.client.findMany({
    where: { organizationId, isActive: true },
    orderBy: { billingDay: "asc" },
    select: {
      id: true,
      name: true,
      monthlyFee: true,
      currency: true,
      billingDay: true,
      payments: { where: { month, year }, select: { id: true, amount: true, status: true, receivedAt: true } },
    },
  });
  return clients.map((c) => ({ ...c, currentPayment: c.payments[0] ?? null }));
}

/** One independent Prisma fetcher per data key, so page.tsx only queries what active widgets/tabs actually need. */
export const DATA_FETCHERS: {
  [K in DataKey]: (organizationId: string, now: Date) => Promise<Pick<DashboardData, K>>;
} = {
  contactsCount: async (organizationId) => ({
    contactsCount: await prisma.contact.count({ where: { organizationId } }),
  }),
  newContactsCount: async (organizationId, now) => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      newContactsCount: await prisma.contact.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),
    };
  },
  upcomingAppointmentsCount: async (organizationId, now) => ({
    upcomingAppointmentsCount: await prisma.appointment.count({
      where: { organizationId, startTime: { gte: now } },
    }),
  }),
  pendingTasksCount: async (organizationId) => ({
    pendingTasksCount: await prisma.task.count({ where: { organizationId, isCompleted: false } }),
  }),
  campaignsCount: async (organizationId) => ({
    campaignsCount: await prisma.emailCampaign.count({ where: { organizationId } }),
  }),
  projectsCount: async (organizationId) => ({
    projectsCount: await prisma.project.count({ where: { organizationId } }),
  }),
  pipelineValue: async (organizationId) => {
    const deals = await prisma.deal.findMany({
      where: { organizationId, stage: { isWon: false, isLost: false } },
      select: { value: true },
    });
    return { pipelineValue: deals.reduce((s, d) => s + (d.value ?? 0), 0) };
  },
  dealStats: async (organizationId, now) => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [wonDeals, totalDeals] = await Promise.all([
      prisma.deal.count({
        where: { organizationId, stage: { isWon: true }, updatedAt: { gte: startOfMonth } },
      }),
      prisma.deal.count({
        where: { organizationId, stage: { OR: [{ isWon: true }, { isLost: true }] }, updatedAt: { gte: startOfMonth } },
      }),
    ]);
    return { dealStats: { closingRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0 } };
  },
  revenueThisMonth: async (organizationId, now) => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [dealPayments, clientPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { organizationId, status: "RECIBIDO", receivedAt: { gte: startOfMonth } },
        select: { amount: true },
      }),
      prisma.clientPayment.findMany({
        where: { organizationId, status: "RECIBIDO", receivedAt: { gte: startOfMonth } },
        select: { amount: true },
      }),
    ]);
    const total = [...dealPayments, ...clientPayments].reduce((s, p) => s + (p.amount ?? 0), 0);
    return { revenueThisMonth: total };
  },
  pendingPaymentsValue: async (organizationId, now) => {
    const dealPayments = await prisma.payment.findMany({
      where: { organizationId, status: "PENDIENTE" },
      select: { amount: true },
    });
    const clients = await getActiveClientsWithCurrentPayment(organizationId, now.getMonth() + 1, now.getFullYear());
    const clientPendingValue = clients.reduce((s, c) => {
      if (c.currentPayment?.status === "RECIBIDO") return s;
      return s + (c.currentPayment?.amount ?? c.monthlyFee);
    }, 0);
    const dealPendingValue = dealPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    return { pendingPaymentsValue: dealPendingValue + clientPendingValue };
  },
  vaultClientsCount: async (organizationId) => ({
    vaultClientsCount: await prisma.client.count({ where: { organizationId, isActive: true } }),
  }),
  latestContacts: async (organizationId) => ({
    latestContacts: await prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  }),
  upcomingAppointments: async (organizationId, now) => ({
    upcomingAppointments: await prisma.appointment.findMany({
      where: { organizationId, startTime: { gte: now } },
      include: { appointmentType: true },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
  }),
  pendingTasks: async (organizationId) => ({
    pendingTasks: await prisma.task.findMany({
      where: { organizationId, isCompleted: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
  }),
  dealsByStage: async (organizationId) => {
    const stages = await prisma.stage.findMany({
      where: { pipeline: { organizationId } },
      orderBy: { order: "asc" },
      include: { deals: { select: { value: true } } },
    });
    return {
      dealsByStage: stages.map((s) => ({
        stageId: s.id,
        name: s.name,
        color: s.color,
        count: s.deals.length,
        value: s.deals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      })),
    };
  },
  latestCampaigns: async (organizationId) => ({
    latestCampaigns: await prisma.emailCampaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  }),
  recentProjects: async (organizationId) => ({
    recentProjects: await prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  }),
  recentPayments: async (organizationId) => {
    const [dealPayments, clientPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          receivedAt: true,
          deal: { select: { title: true } },
        },
      }),
      prisma.clientPayment.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          receivedAt: true,
          client: { select: { name: true } },
        },
      }),
    ]);
    const merged: RecentPaymentEntry[] = [
      ...dealPayments.map((p) => ({ ...p, source: "deal" as const, label: p.deal?.title ?? "—" })),
      ...clientPayments.map((p) => ({ ...p, source: "client" as const, label: p.client.name })),
    ];
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { recentPayments: merged.slice(0, 5) };
  },
  followUpDeals: async (organizationId, now) => {
    const deals = await prisma.deal.findMany({
      where: { organizationId, followUpAt: { lt: now }, stage: { isWon: false, isLost: false } },
      select: {
        id: true,
        title: true,
        followUpAt: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { followUpAt: "asc" },
    });
    return {
      followUpDeals: deals.map((d) => ({ ...d, followUpAt: d.followUpAt!.toISOString() })),
    };
  },
  recentActivity: async (organizationId) => {
    const activity = await prisma.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        deal: { select: { title: true } },
      },
    });
    return { recentActivity: activity };
  },
  recentDeals: async (organizationId) => {
    const deals = await prisma.deal.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        value: true,
        currency: true,
        createdAt: true,
        stage: { select: { name: true, color: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });
    return { recentDeals: deals };
  },
  clientPaymentStats: async (organizationId, now) => {
    const clients = await getActiveClientsWithCurrentPayment(organizationId, now.getMonth() + 1, now.getFullYear());
    const mrr = clients.reduce((s, c) => s + c.monthlyFee, 0);
    const pendingCount = clients.filter((c) => c.currentPayment?.status !== "RECIBIDO").length;
    return { clientPaymentStats: { mrr, pendingCount } };
  },
  clientPaymentsList: async (organizationId, now) => {
    const clients = await getActiveClientsWithCurrentPayment(organizationId, now.getMonth() + 1, now.getFullYear());
    return {
      clientPaymentsList: clients.slice(0, 8).map((c) => ({
        id: c.id,
        name: c.name,
        monthlyFee: c.monthlyFee,
        currency: c.currency,
        billingDay: c.billingDay,
        isPaid: c.currentPayment?.status === "RECIBIDO",
        receivedAt: c.currentPayment?.receivedAt ? c.currentPayment.receivedAt.toISOString() : null,
      })),
    };
  },
  googleCalendar: async (organizationId, now) => {
    const token = await prisma.googleCalendarToken.findUnique({ where: { organizationId } });
    if (!token) return { googleCalendar: { connected: false, events: [] } };

    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const events = await listGoogleCalendarEvents(organizationId, now, in14Days);
    return {
      googleCalendar: {
        connected: true,
        events: events.slice(0, 6).map((e) => ({
          id: e.id,
          summary: e.summary,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          location: e.location ?? null,
          htmlLink: e.htmlLink ?? null,
        })),
      },
    };
  },
};

export async function fetchDashboardData(
  keys: DataKey[],
  organizationId: string,
  now: Date
): Promise<DashboardData> {
  const uniqueKeys = Array.from(new Set(keys));
  const results = await Promise.all(uniqueKeys.map((key) => DATA_FETCHERS[key](organizationId, now)));
  return Object.assign({}, ...results);
}
