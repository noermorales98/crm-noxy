"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Search01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls, selectInline } from "@/src/lib/crm-ui";
import DatePicker from "@/src/components/DatePicker";
import { QUOTE_STATUS_META, QuoteStatusBadge, formatQuoteMoney } from "@/src/components/quotes/shared";
import { DataTable, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Skeleton, type DataColumn } from "@/src/components/ui";

type QuoteRow = {
  id: string;
  folio: string;
  clientName: string;
  clientCompany?: string | null;
  issuedAt: string;
  validUntil?: string | null;
  total: number;
  currency: string;
  status: string;
};

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

function FolioLink({ quote }: { quote: QuoteRow }) {
  return (
    <Link href={`/cotizaciones/${quote.folio}`} className="font-semibold text-text-primary hover:underline">
      {quote.folio}
    </Link>
  );
}

const COLUMNS: DataColumn<QuoteRow>[] = [
  { key: "folio", header: "Folio", render: (q) => <FolioLink quote={q} /> },
  {
    key: "client",
    header: "Cliente",
    render: (q) => (
      <span className="block min-w-0">
        <span className="block font-medium text-text-primary">{q.clientName}</span>
        {q.clientCompany && <span className="block text-xs text-text-secondary">{q.clientCompany}</span>}
      </span>
    ),
  },
  { key: "issued", header: "Fecha", render: (q) => <span className="text-text-secondary">{shortDate(q.issuedAt)}</span> },
  { key: "valid", header: "Vigencia", render: (q) => <span className="text-text-secondary">{q.validUntil ? shortDate(q.validUntil) : "Sin vigencia"}</span> },
  { key: "total", header: "Total", align: "right", render: (q) => <span className="font-semibold text-text-primary">{formatQuoteMoney(q.total, q.currency)}</span> },
  { key: "status", header: "Estado", render: (q) => <QuoteStatusBadge status={q.status} /> },
];

function CotizacionesContent() {
  const { setConfig, resetState } = useHeader();
  const { addToast } = useToast();

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Número de filas visibles, leído dentro de fetchQuotes sin volver a crear el callback.
  const quotesRef = useRef(0);
  useEffect(() => {
    quotesRef.current = quotes.length;
  }, [quotes.length]);

  useEffect(() => {
    resetState();
    setConfig({
      title: "Cotizaciones",
      titleBadge: loading || (loadError && quotes.length === 0) ? undefined : quotes.length,
      pageHeader: true,
    });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, quotes.length, loadError]);

  const fetchQuotes = useCallback(async () => {
    // Si ya hay filas, un fallo no las sustituye: se avisa con un toast (como antes del rediseño).
    const fail = () => {
      setLoadError(true);
      if (quotesRef.current > 0) addToast("Error al cargar cotizaciones", "error");
    };
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (res.ok) {
        setQuotes(await res.json());
        setLoadError(false);
      } else {
        fail();
      }
    } catch {
      fail();
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fromDate, toDate, addToast]);

  useEffect(() => {
    const t = setTimeout(fetchQuotes, 250);
    return () => clearTimeout(t);
  }, [fetchQuotes]);

  const failedEmpty = loadError && quotes.length === 0;
  const filtering = Boolean(search.trim() || statusFilter || fromDate || toDate);

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Cotizaciones"
          subtitle={loading ? "Cargando cotizaciones…" : failedEmpty ? "No se pudo cargar el listado" : `${quotes.length} ${filtering ? "con estos filtros" : "en total"}`}
          actions={
            <>
              <Link href="/cotizaciones/configuracion" className={secondaryAction}>
                <HugeiconsIcon icon={Settings01Icon} size={16} />
                Configuración
              </Link>
              <Link href="/cotizaciones/nueva" className={primaryAction}>
                <HugeiconsIcon icon={Add01Icon} size={16} />
                Nueva cotización
              </Link>
            </>
          }
        />
      </Enter>

      <Enter index={1}>
        <FilterBar
          search={
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="search"
                aria-label="Buscar cotizaciones"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por folio, cliente o empresa"
                className={`${inputCls} pl-9`}
              />
            </div>
          }
          actions={
            <>
              <select aria-label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectInline}>
                <option value="">Todos los estados</option>
                {Object.entries(QUOTE_STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </select>
              <DatePicker value={fromDate} onChange={setFromDate} placeholder="Desde" className="w-[152px] shrink-0" />
              <DatePicker value={toDate} onChange={setToDate} placeholder="Hasta" align="right" className="w-[152px] shrink-0" />
            </>
          }
        />
      </Enter>

      <Enter index={2}>
        <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
          {loading ? (
            <Skeleton shape="rows" count={4} label="Cargando cotizaciones" />
          ) : loadError && quotes.length === 0 ? (
            <ErrorState title="No se pudieron cargar las cotizaciones" onRetry={() => { setLoading(true); fetchQuotes(); }} />
          ) : (
            <DataTable
              label="Cotizaciones"
              columns={COLUMNS}
              rows={quotes}
              getKey={(q) => q.id}
              mobileRow={(q) => (
                <Link href={`/cotizaciones/${q.folio}`} className="flex w-full min-w-0 flex-col gap-1 py-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-text-primary">{q.folio}</span>
                      <span className="block truncate text-sm text-text-primary">{q.clientName}</span>
                      {q.clientCompany && <span className="block truncate text-xs text-text-secondary">{q.clientCompany}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">{formatQuoteMoney(q.total, q.currency)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <QuoteStatusBadge status={q.status} />
                    <span className="text-xs text-text-secondary">{shortDate(q.issuedAt)}</span>
                  </div>
                </Link>
              )}
              empty={
                filtering ? (
                  <EmptyState title="Sin resultados" body="Prueba con otra búsqueda, estado o rango de fechas." />
                ) : (
                  <EmptyState
                    title="No hay cotizaciones"
                    body="Crea tu primera cotización para comenzar."
                    action={
                      <Link href="/cotizaciones/nueva" className={primaryAction}>
                        <HugeiconsIcon icon={Add01Icon} size={16} />
                        Nueva cotización
                      </Link>
                    }
                  />
                )
              }
            />
          )}
        </section>
      </Enter>
    </main>
  );
}

export default function CotizacionesPage() {
  return <CotizacionesContent />;
}
