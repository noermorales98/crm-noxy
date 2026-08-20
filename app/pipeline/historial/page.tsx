"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Calendar02Icon, Building02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { fmtUSD, fmtMXN, StatCard } from "@/src/components/pipeline/PipelineShared";

export default function HistoryPage() {
  const { setConfig, resetState } = useHeader();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    resetState();
    setConfig({ title: "Historial de ventas archivadas" });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (month) query.set("month", month);
        if (year) query.set("year", year);
        if (type !== "all") query.set("type", type);
        
        const res = await fetch(`/api/deals/archived?${query.toString()}`);
        if (res.ok) {
          setDeals(await res.json());
        }
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [month, year, type]);

  const filteredDeals = deals.filter((d) => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    (d.company?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.contact?.firstName || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalWonUSD = filteredDeals.filter(d => d.stage?.isWon && d.currency === "USD").reduce((s, d) => s + (d.value || 0), 0);
  const totalWonMXN = filteredDeals.filter(d => d.stage?.isWon && d.currency === "MXN").reduce((s, d) => s + (d.value || 0), 0);
  const totalLost = filteredDeals.filter(d => d.stage?.isLost).length;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-surface-app font-sans">
      {/* Top bar */}
      <div className="px-5 py-4 bg-white border-b border-border-subtle">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/pipeline" className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors shrink-0">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Historial de ventas</h1>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2.5 mb-4 overflow-x-auto pb-0.5">
          <StatCard
            label="Total Ganado USD"
            value={fmtUSD(totalWonUSD)}
            sub={`${filteredDeals.filter(d => d.stage?.isWon && d.currency === "USD").length} deals`}
            badgePositive={true}
          />
          <StatCard
            label="Total Ganado MXN"
            value={fmtMXN(totalWonMXN)}
            sub={`${filteredDeals.filter(d => d.stage?.isWon && d.currency === "MXN").length} deals`}
            badgePositive={true}
          />
          <StatCard
            label="Total Perdidos"
            value={String(totalLost)}
            sub="Deals no cerrados"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border border-border-subtle bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-border-subtle">
            <option value="">Todo el año</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>

          <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-border-subtle bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-border-subtle">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <select value={type} onChange={e => setType(e.target.value)} className="text-sm border border-border-subtle bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-border-subtle">
            <option value="all">Todos los estados</option>
            <option value="won">Ganados</option>
            <option value="lost">Perdidos</option>
          </select>

          <div className="flex-1 min-w-[200px] relative">
            <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, empresa o contacto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm border border-border-subtle bg-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-border-subtle"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 border border-border-subtle">
              <HugeiconsIcon icon={Calendar02Icon} size={22} color="#9ca3af" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Sin historial</h3>
            <p className="text-xs text-text-secondary">No hay ventas archivadas para este período.</p>
          </div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-app border-b border-border-subtle text-xs font-semibold text-text-secondary">
                  <th className="px-4 py-3">Deal</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Etapa Final</th>
                  <th className="px-4 py-3">Archivado el</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/pipeline/${deal.id}`} className="block">
                        <div className="text-sm font-bold text-text-primary mb-0.5">{deal.title}</div>
                        <div className="text-xs text-text-secondary flex items-center gap-2">
                          {deal.company && (
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={Building02Icon} size={11} /> {deal.company.name}
                            </span>
                          )}
                          {deal.contact && (
                            <span>{deal.contact.firstName} {deal.contact.lastName}</span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                      {deal.currency === "MXN" ? fmtMXN(deal.value) : fmtUSD(deal.value)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full"
                        style={{ backgroundColor: deal.stage?.color + '20', color: deal.stage?.color }}
                      >
                        {deal.stage?.name}
                      </span>
                      {deal.stage?.isWon && <span className="ml-2 text-xs">🎉</span>}
                      {deal.stage?.isLost && <span className="ml-2 text-xs">❌</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {deal.archivedAt ? new Date(deal.archivedAt).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
