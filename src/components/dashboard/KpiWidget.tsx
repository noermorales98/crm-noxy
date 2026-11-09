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
  return (
    <Link
      href={href}
      className={`crm-lift flex h-full flex-col items-start gap-3 rounded-surface border bg-surface-elevated p-5 ${
        highlight ? "border-danger/30 hover:border-danger/60" : "border-line hover:border-text-secondary/40"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
        <HugeiconsIcon icon={icon} size={18} color={iconColor} />
      </span>
      <span className="w-full min-w-0">
        <span className="block text-xs font-semibold text-text-secondary">{label}</span>
        <span
          className={`mt-1 block text-2xl font-semibold leading-tight tracking-[-0.02em] tabular-nums ${
            highlight ? "text-danger" : "text-text-primary"
          }`}
        >
          {value}
        </span>
      </span>
    </Link>
  );
}
