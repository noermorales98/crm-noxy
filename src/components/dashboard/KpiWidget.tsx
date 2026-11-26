import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";

interface KpiWidgetProps {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  /** Colores de dato del widget (se conservan: no son de marca). */
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  href: string;
  highlight?: boolean;
}

/** Cifra clave del dashboard: etiqueta, cifra grande tabular y un acento de dato. */
export function KpiWidget({ icon, iconBg, iconColor, value, label, href, highlight }: KpiWidgetProps) {
  const parts = value.split(" · ");
  return (
    <Link
      href={href}
      className={`crm-lift flex h-full flex-col items-start gap-2 rounded-surface border bg-surface-elevated p-3 sm:gap-3 sm:p-5 ${
        highlight ? "border-danger/30 hover:border-danger/60" : "border-line hover:border-text-secondary/40"
      }`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10" style={{ backgroundColor: iconBg }}>
        <HugeiconsIcon icon={icon} size={18} color={iconColor} />
      </span>
      <span className="w-full min-w-0">
        <span className="block text-xs font-semibold text-text-secondary">{label}</span>
        <span
          className={`mt-0.5 block break-words font-semibold leading-tight tracking-[-0.02em] tabular-nums sm:mt-1 sm:text-2xl ${
            parts.length > 1 ? "text-base" : "text-lg"
          } ${highlight ? "text-danger" : "text-text-primary"}`}
        >
          {/* Varias monedas: una por línea, con la moneda en chico para que las cifras no se amontonen. */}
          {parts.map((part) => {
            const match = /^(.*\S)\s([A-Z]{3})$/.exec(part);
            return (
              <span key={part} className="block">
                {match ? match[1] : part}
                {match && <span className="ml-1 text-xs font-medium tracking-normal text-text-secondary sm:text-sm">{match[2]}</span>}
              </span>
            );
          })}
        </span>
      </span>
    </Link>
  );
}
