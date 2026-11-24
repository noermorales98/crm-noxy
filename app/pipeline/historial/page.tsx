"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls, selectInline } from "@/src/lib/crm-ui";
import { fmtUSD, fmtMXN, StatCard } from "@/src/components/pipeline/PipelineShared";
import { HistoryCharts } from "@/src/components/pipeline/HistoryCharts";
import { Chip, DataTable, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Skeleton, type DataColumn } from "@/src/components/ui";

type ArchivedDeal = {
  id: string;
  title: string;
  value?: number | null;
  currency?: string | null;
  archivedAt?: string | null;
  wonAt?: string | null;
  lostReason?: string | null;
  company?: { name: string } | null;
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  stage?: { name?: string | null; color?: string | null; isWon?: boolean; isLost?: boolean } | null;
};

type MonthClosing = {
  source: "snapshot" | "live" | "none" | "year";
  months?: number;
  note?: string;
  metrics: {
    created: number;
    won: { count: number; byCurrency: Record<string, number> };
    lost: { count: number };
    closingRate: number | null;
    paymentsReceived: Record<string, number>;
  } | null;
};

const moneyByCurrency = (bucket: Record<string, number> | undefined) => {
  const parts = Object.entries(bucket ?? {}).map(([currency, amount]) => (currency === "MXN" ? fmtMXN(amount) : fmtUSD(amount)));
  return parts.length ? parts.join(" · ") : "—";
};

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const money = (d: ArchivedDeal) => (d.currency === "MXN" ? fmtMXN(d.value ?? 0) : fmtUSD(d.value ?? 0));

/** Monto con su moneda escrita (MXN o USD), para no depender solo del símbolo «$». */
function MoneyCell({ deal }: { deal: ArchivedDeal }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-1.5 whitespace-nowrap">
      <span className="font-semibold tabular-nums text-text-primary">{money(deal)}</span>
      <span className="rounded bg-surface-sidebar px-1.5 py-0.5 text-xs font-semibold tracking-wide text-text-secondary">{deal.currency === "MXN" ? "MXN" : "USD"}</span>
    </span>
  );
}
const archivedOn = (d: ArchivedDeal) =>
  d.archivedAt ? new Date(d.archivedAt).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }) : "";

/** Etapa final con el color que guardó el usuario (dato) y el resultado en texto. */
function StageCell({ deal }: { deal: ArchivedDeal }) {
  const color = deal.stage?.color || "#6B7280";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-sidebar px-2.5 text-xs font-semibold text-text-primary">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        {deal.stage?.name}
      </span>
      {deal.stage?.isWon && <Chip tone="done">Ganado</Chip>}
      {deal.stage?.isLost && <Chip tone="late">Perdido</Chip>}
      {deal.stage?.isLost && deal.lostReason && <span className="basis-full text-xs text-text-secondary">Motivo: {deal.lostReason}</span>}
    </span>
  );
}

function DealName({ deal }: { deal: ArchivedDeal }) {
  return (
    <Link href={`/pipeline/${deal.id}`} className="block min-w-0 hover:underline">
      <span className="block truncate text-sm font-semibold text-text-primary">{deal.title}</span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        {deal.company && (
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Building02Icon} size={12} /> {deal.company.name}
          </span>
        )}
        {deal.contact && <span>{deal.contact.firstName} {deal.contact.lastName}</span>}
      </span>
    </Link>
  );
}

const COLUMNS: DataColumn<ArchivedDeal>[] = [
  { key: "deal", header: "Deal", render: (d) => <DealName deal={d} /> },
  { key: "value", header: "Valor", align: "right", render: (d) => <MoneyCell deal={d} /> },
  { key: "stage", header: "Etapa final", render: (d) => <StageCell deal={d} /> },
  { key: "archived", header: "Archivado el", render: (d) => <span className="text-text-secondary">{archivedOn(d)}</span> },
];

export default function HistoryPage() {
  const { setConfig, resetState } = useHeader();
  const [deals, setDeals] = useState<ArchivedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  // Las recargas automáticas (volver a la pestaña) no muestran el esqueleto: la lista se queda y se actualiza en silencio.
  const silentRef = useRef(false);

  // Filters
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [closing, setClosing] = useState<MonthClosing | null>(null);

  // Cierre guardado del mes elegido (o cifras en vivo si es el mes en curso).
  useEffect(() => {
    if (!year) {
      setClosing(null);
      return;
    }
    let stale = false;
    // Con un mes elegido: el cierre de ese mes. Con «Todo el año»: la suma de los meses del año.
    const query = month ? `month=${year}-${month.padStart(2, "0")}` : `year=${year}`;
    fetch(`/api/sales/months?${query}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!stale) setClosing(data);
      })
      .catch(() => {
        if (!stale) setClosing(null);
      });
    return () => {
      stale = true;
    };
  }, [month, year, reload]);

  useEffect(() => {
    resetState();
    setConfig({ title: "Historial de ventas archivadas", backHref: "/pipeline", pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Una respuesta lenta de un filtro anterior no pisa la del filtro actual.
    let stale = false;
    async function fetchHistory() {
      const silent = silentRef.current;
      silentRef.current = false;
      if (!silent) setLoading(true);
      setLoadError(false);
      try {
        const query = new URLSearchParams();
        if (month) query.set("month", month);
        if (year) query.set("year", year);
        if (type !== "all") query.set("type", type);

        const res = await fetch(`/api/deals/archived?${query.toString()}`, { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (stale) return;
        if (data) setDeals(data);
        else if (!silent) setLoadError(true);
      } catch {
        if (!stale && !silent) setLoadError(true);
      } finally {
        if (!stale) setLoading(false);
      }
    }
    fetchHistory();
    return () => {
      stale = true;
    };
  }, [month, year, type, reload]);

  // Al volver a la pestaña o a esta pantalla (p. ej. tras editar un deal) se vuelven a pedir los datos.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      silentRef.current = true;
      setReload((n) => n + 1);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const term = search.toLowerCase();
  const filteredDeals = deals.filter(
    (d) =>
      d.title.toLowerCase().includes(term) ||
      (d.company?.name || "").toLowerCase().includes(term) ||
      (d.contact?.firstName || "").toLowerCase().includes(term),
  );

  const wonUSD = filteredDeals.filter((d) => d.stage?.isWon && d.currency === "USD");
  const wonMXN = filteredDeals.filter((d) => d.stage?.isWon && d.currency === "MXN");
  const totalWonUSD = wonUSD.reduce((s, d) => s + (d.value || 0), 0);
  const totalWonMXN = wonMXN.reduce((s, d) => s + (d.value || 0), 0);
  const totalLost = filteredDeals.filter((d) => d.stage?.isLost).length;

  const selectCls = selectInline;

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Historial de ventas"
          subtitle={loading ? "Cargando historial…" : `${filteredDeals.length} ventas archivadas en el período`}
        />
      </Enter>

      {closing && (
        <Enter index={1}>
          <section aria-label="Cierre del período" className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-text-primary">
              {month ? `Cierre de ${MONTHS[Number(month) - 1]} ${year}` : `Resumen de ${year}`}
              <span className="ml-2 text-xs font-normal text-text-secondary">
                {closing.source === "snapshot"
                  ? "Guardado al cerrar el mes"
                  : closing.source === "live"
                    ? "En vivo: el mes aún no termina"
                    : closing.source === "year"
                      ? `Suma de ${closing.months} ${closing.months === 1 ? "mes" : "meses"} con cifras`
                      : ""}
              </span>
            </h2>
            {closing.metrics ? (
              <div className="flex overflow-x-auto rounded-surface border border-line bg-surface-elevated">
                <StatCard label="Ventas ganadas" value={String(closing.metrics.won.count)} sub={moneyByCurrency(closing.metrics.won.byCurrency)} />
                <StatCard label="Perdidos" value={String(closing.metrics.lost.count)} sub={`${closing.metrics.created} deals nuevos`} />
                <StatCard label="Tasa de cierre" value={closing.metrics.closingRate === null ? "—" : `${closing.metrics.closingRate}%`} sub="Ganados ÷ cerrados" />
                <StatCard label="Cobros recibidos" value={moneyByCurrency(closing.metrics.paymentsReceived)} sub={closing.source === "year" ? "En el año" : "En el mes"} />
              </div>
            ) : (
              <p className="rounded-surface border border-line bg-surface-elevated p-4 text-sm text-text-secondary">{closing.note ?? "Sin datos para este mes."}</p>
            )}
          </section>
        </Enter>
      )}

      <Enter index={1}>
        <section aria-label="Resumen del período" className="mb-4 flex overflow-x-auto rounded-surface border border-line bg-surface-elevated">
          <StatCard label="Total ganado USD" value={fmtUSD(totalWonUSD)} sub={`${wonUSD.length} deals`} />
          <StatCard label="Total ganado MXN" value={fmtMXN(totalWonMXN)} sub={`${wonMXN.length} deals`} />
          <StatCard label="Total perdidos" value={String(totalLost)} sub="Deals no cerrados" />
        </section>
      </Enter>

      {!loading && !loadError && (
        <Enter index={2}>
          <HistoryCharts deals={filteredDeals} year={Number(year)} month={month ? Number(month) : ""} />
        </Enter>
      )}

      <Enter index={2}>
        <FilterBar
          search={
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="search"
                aria-label="Buscar ventas archivadas"
                placeholder="Buscar por título, empresa o contacto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          }
          actions={
            <>
              <select aria-label="Mes" value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
                <option value="">Todo el año</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select aria-label="Año" value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <select aria-label="Resultado" value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                <option value="all">Todos los estados</option>
                <option value="won">Ganados</option>
                <option value="lost">Perdidos</option>
              </select>
            </>
          }
        />
      </Enter>

      <Enter index={3}>
        <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
          {loading ? (
            <Skeleton shape="rows" count={4} label="Cargando historial" />
          ) : loadError ? (
            <ErrorState title="No se pudo cargar el historial" onRetry={() => setReload((n) => n + 1)} />
          ) : (
            <DataTable
              label="Ventas archivadas"
              columns={COLUMNS}
              rows={filteredDeals}
              getKey={(d) => d.id}
              mobileRow={(d) => (
                <div className="flex w-full min-w-0 flex-col gap-1.5 py-1">
                  <div className="flex items-start justify-between gap-3">
                    <DealName deal={d} />
                    <span className="shrink-0 text-sm"><MoneyCell deal={d} /></span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StageCell deal={d} />
                    <span className="text-xs text-text-secondary">{archivedOn(d)}</span>
                  </div>
                </div>
              )}
              empty={<EmptyState title="Sin historial" body="No hay ventas archivadas para este período. Cambia el mes, el año o el estado." />}
            />
          )}
        </section>
      </Enter>
    </main>
  );
}
