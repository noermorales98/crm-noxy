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

/** Variación con signo: neutra o de error; el texto lleva el sentido (DESIGN.md). */
function StatBadge({ children, positive }: { children: string; positive?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {children}
    </span>
  );
}

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
    <div className="relative flex min-w-[160px] flex-1 flex-col gap-1 border-line px-4 py-3 [&:not(:first-child)]:border-l">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">{label}</p>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label={`Ocultar ${label}`}
            title="Ocultar resumen"
            className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:size-7"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} />
          </button>
        )}
      </div>
      {values ? (
        <div className="flex flex-col gap-0.5">
          {values.map((v) => (
            <div key={v.label} className="flex items-baseline gap-1.5">
              <p className="truncate text-lg font-semibold tabular-nums text-text-primary">{v.amount}</p>
              <span className="shrink-0 rounded-full bg-surface-sidebar px-1.5 py-0.5 text-xs font-semibold text-text-secondary">{v.label}</span>
            </div>
          ))}
          {badge && (
            <span className="self-start">
              <StatBadge positive={badgePositive}>{badge}</StatBadge>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-xl font-semibold tabular-nums text-text-primary">{value}</p>
          {badge && <StatBadge positive={badgePositive}>{badge}</StatBadge>}
        </div>
      )}
      <p className="text-xs text-text-secondary">{sub}</p>
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
      type="button"
      onClick={onRestore}
      title="Restaurar resumen"
      aria-label={`Restaurar ${label}`}
      className="crm-press group flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-surface-elevated px-3 transition-colors hover:bg-surface-sidebar lg:min-h-9"
    >
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      <span className="max-w-[140px] truncate text-xs font-semibold tabular-nums text-text-primary">{value}</span>
      <span className="text-text-secondary transition-colors group-hover:text-text-primary">
        <HugeiconsIcon icon={Add01Icon} size={12} />
      </span>
    </button>
  );
}
