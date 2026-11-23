import { prisma } from "@/src/lib/db";
import { ACTIVE_DEALS } from "@/src/lib/deal-filters";
import { listMemberships } from "@/src/lib/organization-service";
import { loadWonSales } from "@/src/lib/won-sales";
import { agencyMemberships, buildAgencyCard, sortAgencyCards, type AgencyCard } from "@/src/lib/agency-panel";

/**
 * Tarjetas del panel «Clientes»: una por sub-cuenta donde esta persona es OWNER o tiene el permiso «agency».
 * Cada consulta lleva su propio `organizationId`; nunca se lee una organización donde no hay membresía.
 */
export async function loadAgencyCards(userId: string, currentOrganizationId: string | null): Promise<AgencyCard[]> {
  const memberships = await listMemberships(userId);
  const allowed = agencyMemberships(
    memberships.map((m) => ({ organizationId: m.organizationId, organizationName: m.organization.name, role: m.role, permissions: m.permissions })),
  );
  const now = new Date();
  const cards = await Promise.all(
    allowed.map(async (m) => {
      const organizationId = m.organizationId;
      const [openDeals, overdueTasks, pendingClientPayments, pendingDealPayments, snapshot, won] = await Promise.all([
        prisma.deal.count({ where: { organizationId, ...ACTIVE_DEALS, stage: { isWon: false, isLost: false } } }),
        prisma.task.count({ where: { organizationId, isCompleted: false, dueDate: { lt: now } } }),
        prisma.clientPayment.count({ where: { organizationId, status: "PENDIENTE", month: now.getMonth() + 1, year: now.getFullYear() } }),
        prisma.payment.count({ where: { organizationId, status: "PENDIENTE" } }),
        prisma.monthlySnapshot.findFirst({ where: { organizationId }, orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true, metrics: true } }),
        loadWonSales(organizationId),
      ]);
      return buildAgencyCard({
        organizationId,
        name: m.organizationName,
        currentOrganizationId,
        openDeals,
        wonThisMonth: { count: won.month.count, byCurrency: won.month.byCurrency },
        overdueTasks,
        pendingPayments: pendingClientPayments + pendingDealPayments,
        snapshot,
      });
    }),
  );
  return sortAgencyCards(cards);
}
