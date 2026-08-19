import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";

interface KpiWidgetProps {
  icon: any;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  href: string;
  highlight?: boolean;
}

export function KpiWidget({ icon, iconBg, iconColor, value, label, href, highlight }: KpiWidgetProps) {
  return (
    <Link
      href={href}
      className={`bg-surface-elevated rounded-surface p-5 h-full flex items-start gap-3 hover:bg-nav-hover transition-colors ${
        highlight ? "bg-red-50/50" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
        <HugeiconsIcon icon={icon} size={20} color={iconColor} />
      </div>
      <div>
        <p className={`text-xl font-bold ${highlight ? "text-red-600" : "text-text-primary"}`}>{value}</p>
        <p className="text-xs text-text-secondary mt-0.5">{label}</p>
      </div>
    </Link>
  );
}
