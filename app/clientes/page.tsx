import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDbUnavailableError } from "@/src/lib/db";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";
import AgencyOpenButton from "@/src/components/AgencyOpenButton";
import AgencyNewClient from "@/src/components/AgencyNewClient";
import { EmptyState, Enter, PageHeader, StatStrip } from "@/src/components/ui";
import { loadAgencyCards } from "@/src/lib/agency-service";
import { monthLabel, type AgencyCard } from "@/src/lib/agency-panel";
import { formatByCurrency } from "@/src/lib/deal-sales";
import { hasPermission, type ModulePermissions, type RoleName } from "@/src/lib/permissions";

type Claims = { currentOrganizationId?: string | null; role?: RoleName | null; permissions?: Partial<ModulePermissions> | null };

export default async function ClientesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const claims = session as unknown as Claims;
  if (!hasPermission(claims.role, claims.permissions, "agency")) redirect("/");

  let cards: AgencyCard[];
  try {
    cards = await loadAgencyCards(session.user.id, claims.currentOrganizationId ?? null);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return (
      <div className="crm-mobile-bottom-clearance flex flex-1 flex-col">
        <DbUnavailableNotice />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-text-secondary">No se pudo cargar el panel ahora. Reintenta en unos minutos.</p>
        </div>
      </div>
    );
  }

  const totals = cards.reduce(
    (acc, card) => ({ open: acc.open + card.openDeals, overdue: acc.overdue + card.overdueTasks, payments: acc.payments + card.pendingPayments }),
    { open: 0, overdue: 0, payments: 0 },
  );

  return (
    <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader title="Clientes" subtitle="Tus sub-cuentas: cada cliente con su propio pipeline, contactos y formularios." actions={<AgencyNewClient />} />
      </Enter>
      <Enter index={1}>
        <StatStrip
          items={[
            { label: "Clientes", value: cards.length },
            { label: "Deals abiertos", value: totals.open },
            { label: "Tareas vencidas", value: totals.overdue },
            { label: "Cobros pendientes", value: totals.payments },
          ]}
        />
      </Enter>
      <Enter index={2}>
        {cards.length === 0 ? (
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <EmptyState title="Aún no tienes clientes" body="Crea el primero con «Nuevo cliente»." />
          </section>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <li key={card.organizationId} className="flex flex-col gap-3 rounded-surface border border-line bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-text-primary">{card.name}</h2>
                    {card.current && <p className="text-xs text-text-secondary">Cuenta activa</p>}
                  </div>
                  <AgencyOpenButton organizationId={card.organizationId} current={card.current} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Metric label="Deals abiertos" value={card.openDeals} />
                  <Metric label="Ganados este mes" value={card.wonThisMonth.count} hint={card.wonThisMonth.count ? formatByCurrency(card.wonThisMonth.byCurrency) : undefined} />
                  <Metric label="Tareas vencidas" value={card.overdueTasks} warn={card.overdueTasks > 0} />
                  <Metric label="Cobros pendientes" value={card.pendingPayments} warn={card.pendingPayments > 0} />
                </dl>
                <p className="border-t border-line pt-2 text-xs text-text-secondary">
                  {card.lastClose
                    ? `Último cierre (${monthLabel(card.lastClose.month)}): ${card.lastClose.wonCount} ganados${card.lastClose.wonCount ? ` · ${formatByCurrency(card.lastClose.won)}` : ""}${card.lastClose.closingRate !== null ? ` · cierre ${card.lastClose.closingRate}%` : ""}`
                    : "Aún sin cierre mensual."}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Enter>
    </main>
  );
}

function Metric({ label, value, hint, warn }: { label: string; value: number; hint?: string; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className={`font-semibold ${warn ? "text-danger" : "text-text-primary"}`}>
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-text-secondary">{hint}</span>}
      </dd>
    </div>
  );
}
