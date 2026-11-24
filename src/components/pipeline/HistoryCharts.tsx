"use client";

import { useMemo } from "react";
import { bucketDeals, outcomeCounts, type HistoryDeal } from "@/src/lib/history-charts";
import { fmtMXN, fmtUSD } from "@/src/components/pipeline/PipelineShared";

const compact = (n: number) => new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const plural = (n: number) => `${n} ${n === 1 ? "venta" : "ventas"}`;

/** Globo que aparece al pasar el cursor o enfocar con teclado; se alinea según la posición para no salirse de la tarjeta. */
function Tip({ title, lines, align = "center" }: { title: string; lines: string[]; align?: "left" | "center" | "right" }) {
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max max-w-[220px] rounded-control border border-line bg-surface-elevated px-3 py-2 text-left shadow-lg group-hover/col:block group-focus-visible/col:block ${pos}`}
    >
      <span className="block text-xs font-semibold text-text-primary first-letter:uppercase">{title}</span>
      {lines.map((line) => (
        <span key={line} className="block text-xs tabular-nums text-text-secondary">{line}</span>
      ))}
    </span>
  );
}

type BarDatum = { label: string; full: string; value: number; deals: number };

/** Barras verticales de un color: la altura es el monto; el detalle sale al pasar el cursor. */
function Bars({ data, color, format, label }: { data: BarDatum[]; color: string; format: (n: number) => string; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const dense = data.length > 14;
  return (
    <div role="group" aria-label={label} className="flex h-36 items-end gap-1">
      {data.map((d, i) => {
        const align = i < data.length / 4 ? "left" : i >= (data.length * 3) / 4 ? "right" : "center";
        return (
          <div
            key={`${d.label}-${i}`}
            tabIndex={0}
            aria-label={`${d.full}: ${format(d.value)}, ${plural(d.deals)}`}
            className="group/col relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1 rounded-sm outline-none hover:bg-surface-sidebar focus-visible:bg-surface-sidebar"
          >
            <Tip title={d.full} lines={[format(d.value), plural(d.deals)]} align={align} />
            {!dense && d.value > 0 && <span className="text-xs font-semibold tabular-nums text-text-secondary">{compact(d.value)}</span>}
            <div className="w-full rounded-t-sm" style={{ height: max > 0 ? `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` : 0, backgroundColor: color, minHeight: d.value > 0 ? 3 : 0 }} />
            <span className="text-xs leading-none text-text-secondary">{dense && i % 2 === 1 ? "" : d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartCard({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-surface border border-line bg-surface-elevated p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {sub && <p className="mb-3 text-xs text-text-secondary">{sub}</p>}
      {children}
    </section>
  );
}

/** Gráficos del historial: ganado por período (cada moneda aparte) y ganados vs. perdidos. */
export function HistoryCharts({ deals, year, month }: { deals: HistoryDeal[]; year: number; month: number | "" }) {
  const buckets = useMemo(() => bucketDeals(deals, year, month), [deals, year, month]);
  const outcome = useMemo(() => outcomeCounts(deals), [deals]);
  const totalMXN = buckets.reduce((s, b) => s + b.MXN, 0);
  const totalUSD = buckets.reduce((s, b) => s + b.USD, 0);
  const period = month === "" ? "por mes" : "por día";
  const closed = outcome.won + outcome.lost;

  return (
    <section aria-label="Gráficos del período" className="mb-4 grid gap-3 lg:grid-cols-3">
      <ChartCard title={`Ganado en MXN ${period}`} sub={fmtMXN(totalMXN)}>
        <Bars data={buckets.map((b) => ({ label: b.label, full: b.full, value: b.MXN, deals: b.nMXN }))} color="var(--color-brand-indigo)" format={fmtMXN} label={`Ganado en pesos ${period}`} />
      </ChartCard>
      <ChartCard title={`Ganado en USD ${period}`} sub={fmtUSD(totalUSD)}>
        <Bars data={buckets.map((b) => ({ label: b.label, full: b.full, value: b.USD, deals: b.nUSD }))} color="var(--color-brand-memory)" format={fmtUSD} label={`Ganado en dólares ${period}`} />
      </ChartCard>
      <ChartCard title="Ganados vs. perdidos" sub={outcome.rate === null ? "Sin cierres en el período" : `Tasa de cierre ${outcome.rate}%`}>
        {closed === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">Sin ventas cerradas.</p>
        ) : (
          <div className="flex h-36 flex-col justify-center gap-4" role="group" aria-label={`${outcome.won} ganados y ${outcome.lost} perdidos`}>
            <div className="flex h-5 w-full rounded-full bg-surface-sidebar">
              {outcome.won > 0 && (
                <div tabIndex={0} aria-label={`Ganados: ${outcome.won}`} className={`group/col relative h-full outline-none ${outcome.lost === 0 ? "rounded-full" : "rounded-l-full"}`} style={{ width: `${(outcome.won / closed) * 100}%`, backgroundColor: "var(--color-success)" }}>
                  <Tip title="Ganados" lines={[plural(outcome.won), `${Math.round((outcome.won / closed) * 100)}% de los cierres`]} align="left" />
                </div>
              )}
              {outcome.lost > 0 && (
                <div tabIndex={0} aria-label={`Perdidos: ${outcome.lost}`} className={`group/col relative h-full outline-none ${outcome.won === 0 ? "rounded-full" : "rounded-r-full"}`} style={{ width: `${(outcome.lost / closed) * 100}%`, backgroundColor: "var(--color-danger)" }}>
                  <Tip title="Perdidos" lines={[plural(outcome.lost), `${Math.round((outcome.lost / closed) * 100)}% de los cierres`]} align="right" />
                </div>
              )}
            </div>
            <dl className="flex justify-between text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-success)" }} aria-hidden="true" /> Ganados
                </dt>
                <dd className="text-xl font-semibold tabular-nums text-text-primary">{outcome.won}</dd>
              </div>
              <div className="text-right">
                <dt className="flex items-center justify-end gap-1.5 text-xs text-text-secondary">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-danger)" }} aria-hidden="true" /> Perdidos
                </dt>
                <dd className="text-xl font-semibold tabular-nums text-text-primary">{outcome.lost}</dd>
              </div>
            </dl>
          </div>
        )}
      </ChartCard>
    </section>
  );
}
