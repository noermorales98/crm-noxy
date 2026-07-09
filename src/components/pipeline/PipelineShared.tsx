import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Add01Icon } from "@hugeicons/core-free-icons";

export function fmtUSD(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

export function fmtMXN(v: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(v);
}

export function fmtCurrency(v: number, currency: string) {
  return currency === "MXN" ? fmtMXN(v) : fmtUSD(v);
}

export type StatDef = {
  id: string;
  label: string;
  value?: string;
  values?: { label: string; amount: string }[];
  sub: string;
  badge?: string;
  badgePositive?: boolean;
  chipValue: string;
};

// ─── Stats Card ───────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  values,
  sub,
  badge,
  badgePositive,
  onHide,
}: {
  label: string;
  value?: string;
  values?: { label: string; amount: string }[];
  sub: string;
  badge?: string;
  badgePositive?: boolean;
  onHide?: () => void;
}) {
  return (
    <div className="group relative bg-white border border-border-subtle rounded-lg p-3 flex-1 min-w-[140px]">
      {onHide && (
        <button
          onClick={onHide}
          title="Ocultar resumen"
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-all"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} />
        </button>
      )}
      <p className="text-[10px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wide pr-4">{label}</p>
      {values ? (
        <div className="flex flex-col gap-0.5 mb-0.5">
          {values.map((v) => (
            <div key={v.label} className="flex items-baseline gap-1.5">
              <p className="text-lg font-bold text-text-primary truncate">{v.amount}</p>
              <span className="text-[10px] font-semibold text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{v.label}</span>
            </div>
          ))}
          {badge && (
            <span className={`mt-0.5 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <p className="text-xl font-bold text-text-primary truncate">{value}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] text-text-secondary">{sub}</p>
    </div>
  );
}

// ─── Compact stat chip (minimized summary bar) ────────────────────────────────

export function StatChip({
  label,
  value,
  onRestore,
}: {
  label: string;
  value: string;
  onRestore: () => void;
}) {
  return (
    <button
      onClick={onRestore}
      title="Restaurar resumen"
      className="group flex items-center gap-2 shrink-0 bg-white border border-border-subtle rounded-lg px-3 py-1.5 hover:border-gray-300 hover:bg-nav-hover transition-colors"
    >
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-text-primary truncate max-w-[140px]">{value}</span>
      <span className="text-text-secondary group-hover:text-text-primary transition-colors">
        <HugeiconsIcon icon={Add01Icon} size={12} />
      </span>
    </button>
  );
}
