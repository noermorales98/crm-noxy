import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DollarCircleIcon,
  Analytics01Icon,
  CalendarCheckIn01Icon,
  TrendingUp,
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
      iconBg: "bg-blue-50",
      iconColor: "#3b82f6",
      href: "/pipeline",
    },
    {
      label: "Tasa de cierre",
      value: `${closingRate}%`,
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "#16a34a",
      href: "/pipeline",
    },
    {
      label: "Ingreso este mes",
      value: formatCurrency(revenueThisMonth),
      icon: Analytics01Icon,
      iconBg: "bg-purple-50",
      iconColor: "#9333ea",
      href: "/pipeline",
    },
    {
      label: "Follow-ups vencidos",
      value: String(followUpsDue),
      icon: CalendarCheckIn01Icon,
      iconBg: followUpsDue > 0 ? "bg-red-50" : "bg-gray-100",
      iconColor: followUpsDue > 0 ? "#dc2626" : "#6b7280",
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
          className={`bg-white rounded-2xl border p-5 flex items-start gap-3 hover:shadow-md transition-all ${
            m.highlight ? "border-red-200 bg-red-50/40" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.iconBg}`}>
            <HugeiconsIcon icon={m.icon} size={20} color={m.iconColor} />
          </div>
          <div>
            <p className={`text-xl font-bold ${m.highlight ? "text-red-600" : "text-gray-900"}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
