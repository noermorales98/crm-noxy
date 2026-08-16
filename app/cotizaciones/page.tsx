"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice01Icon, Add01Icon, Search01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";
import DatePicker from "@/src/components/DatePicker";
import { QUOTE_STATUS_META, QuoteStatusBadge, formatQuoteMoney } from "@/src/components/quotes/shared";

function CotizacionesContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const { setConfig, resetState } = useHeader();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    resetState();
    setConfig({
      title: "Cotizaciones",
      titleBadge: loading ? undefined : quotes.length,
      addButton: { label: "Nueva cotización", onClick: () => router.push("/cotizaciones/nueva") },
    });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, quotes.length]);

  const fetchQuotes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (res.ok) setQuotes(await res.json());
      else addToast("Error al cargar cotizaciones", "error");
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fromDate, toDate, addToast]);

  useEffect(() => {
    const t = setTimeout(fetchQuotes, 250);
    return () => clearTimeout(t);
  }, [fetchQuotes]);

  const rows = useMemo(() => quotes, [quotes]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
      {/* Filtros: todo en una sola línea */}
      <div className="flex items-center gap-2 mb-5 flex-nowrap">
        <div className="relative flex-1 min-w-[120px]">
          <HugeiconsIcon icon={Search01Icon} size={15} color="#9ca3af" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, cliente o empresa…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="shrink-0 w-[118px] pl-2.5 pr-1 py-2 rounded-lg bg-surface-sidebar text-text-primary text-[13px] outline-none focus:bg-surface-elevated focus:ring-1 focus:ring-border-subtle transition-colors cursor-pointer"
        >
          <option value="">Estado: Todos</option>
          {Object.entries(QUOTE_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
        <DatePicker
          value={fromDate}
          onChange={setFromDate}
          placeholder="Desde"
          className="w-[152px] shrink-0"
        />
        <span className="text-text-secondary text-xs shrink-0">–</span>
        <DatePicker
          value={toDate}
          onChange={setToDate}
          placeholder="Hasta"
          align="right"
          className="w-[152px] shrink-0"
        />
        <Link
          href="/cotizaciones/configuracion"
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors"
          title="Configuración de cotizaciones"
        >
          <HugeiconsIcon icon={Settings01Icon} size={17} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
          <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={Invoice01Icon} size={28} color="#9ca3af" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">No hay cotizaciones</h3>
          <p className="text-sm text-text-secondary mb-5">Crea tu primera cotización para comenzar.</p>
          <Link
            href="/cotizaciones/nueva"
            className="inline-flex items-center gap-2 bg-action-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} color="white" />
            Nueva cotización
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-sidebar/60">
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Folio</th>
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Vigencia</th>
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => router.push(`/cotizaciones/${q.folio}`)}
                  className="hover:bg-surface-sidebar/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-semibold text-text-primary">{q.folio}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-text-primary">{q.clientName}</p>
                    {q.clientCompany && <p className="text-xs text-text-secondary">{q.clientCompany}</p>}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {new Date(q.issuedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {q.validUntil
                      ? new Date(q.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-text-primary">
                    {formatQuoteMoney(q.total, q.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <QuoteStatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function CotizacionesPage() {
  return <CotizacionesContent />;
}
