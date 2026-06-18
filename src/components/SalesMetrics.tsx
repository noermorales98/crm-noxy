import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DollarCircleIcon,
  Analytics01Icon,
  CalendarCheckIn01Icon,
} from "@hugeicons/core-free-icons";

interface Props {
  pipelineValue: number;
  closingRate: number;
  revenueThisMonth: number;
  followUpsDue: number;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

export function SalesMetrics({ pipelineValue, closingRate, revenueThisMonth, followUpsDue }: Props) {
  const metrics = [
    {
      label: "Pipeline activo",
      value: formatCurrency(pipelineValue),
      icon: DollarCircleIcon,
      iconBg: "#E1F0FF",
      iconColor: "#337EA9",
      href: "/pipeline",
    },
    {
      label: "Tasa de cierre",
      value: `${closingRate}%`,
      icon: Analytics01Icon,
      iconBg: "#E2F6E9",
      iconColor: "#448361",
      href: "/pipeline",
    },
    {
      label: "Ingreso este mes",
      value: formatCurrency(revenueThisMonth),
      icon: DollarCircleIcon,
      iconBg: "#F0E6F9",
      iconColor: "#9065B0",
      href: "/pipeline",
    },
    {
      label: "Follow-ups vencidos",
      value: String(followUpsDue),
      icon: CalendarCheckIn01Icon,
      iconBg: followUpsDue > 0 ? "#FFE2E2" : "#F7F7F5",
      iconColor: followUpsDue > 0 ? "#D44020" : "#787774",
      href: "/pipeline",
      highlight: followUpsDue > 0,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Link
          key={m.label}
          href={m.href}
          className={`bg-surface-elevated rounded-lg p-5 flex items-start gap-3 hover:bg-nav-hover transition-colors ${
            m.highlight ? "bg-red-50/50" : ""
          }`}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: m.iconBg }}
          >
            <HugeiconsIcon icon={m.icon} size={20} color={m.iconColor} />
          </div>
          <div>
            <p className={`text-xl font-bold ${m.highlight ? "text-red-600" : "text-text-primary"}`}>{m.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{m.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
