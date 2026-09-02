"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicProjectHeader({
  token,
  name,
  icon,
  counts,
}: {
  token: string;
  name: string;
  icon: string | null;
  counts: { pendingTasks: number; docs: number; submissions: number };
}) {
  const pathname = usePathname();
  const base = `/proyecto/${token}`;

  const tabs: { href: string; label: string; exact?: boolean; count: number }[] = [
    { href: base, label: "Resumen", exact: true, count: 0 },
    { href: `${base}/tareas`, label: "Tareas", count: counts.pendingTasks },
    { href: `${base}/docs`, label: "Docs", count: counts.docs },
    { href: `${base}/registros`, label: "Registrados", count: counts.submissions },
  ];

  return (
    <header className="border-b border-border-subtle bg-white">
      <div className="max-w-5xl mx-auto w-full px-6 pt-6">
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl leading-none">{icon}</span>}
          <h1 className="text-lg font-bold text-text-primary truncate">{name}</h1>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname?.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  isActive
                    ? "border-action-primary text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-action-primary text-action-primary-foreground" : "bg-gray-100 text-text-secondary"
                    }`}
                  >
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
