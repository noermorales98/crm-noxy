"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatMesParam, isCurrentMonth, parseMesParam, shiftMonth } from "@/src/lib/content-month";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function calendarPath(pathname: string): string {
  if (pathname === "/contenido/general" || /^\/contenido\/[^/]+$/.test(pathname)) return pathname;
  return "/contenido/general";
}

export default function ContentMiniMonth() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const mes = searchParams.get("mes");
  const parsed = parseMesParam(mes);
  const [view, setView] = useState(parsed ?? { year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    const next = parseMesParam(mes);
    const current = new Date();
    setView(next ?? { year: current.getFullYear(), month: current.getMonth() });
  }, [mes]);

  const label = new Date(view.year, view.month, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const firstWeekday = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const prev = shiftMonth(view.year, view.month, -1);
  const prevDays = new Date(Date.UTC(prev.year, prev.month + 1, 0)).getUTCDate();
  const cells: { year: number; month: number; day: number; inMonth: boolean }[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ year: prev.year, month: prev.month, day: prevDays - i, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ year: view.year, month: view.month, day, inMonth: true });
  }
  const next = shiftMonth(view.year, view.month, 1);
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ year: next.year, month: next.month, day: trailing, inMonth: false });
    trailing += 1;
  }

  const openMonth = (year: number, month: number) => {
    const base = calendarPath(pathname);
    const params = new URLSearchParams(base === pathname ? searchParams.toString() : "");
    if (isCurrentMonth(year, month)) params.delete("mes");
    else params.set("mes", formatMesParam(year, month));
    const query = params.toString();
    router.replace(query ? `${base}?${query}` : base, { scroll: false });
    setView({ year, month });
  };

  return (
    <div className="shrink-0 border-t border-border-subtle px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label="Mes anterior"
          className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-nav-hover"
          onClick={() => {
            const next = shiftMonth(view.year, view.month, -1);
            openMonth(next.year, next.month);
          }}
        >
          ‹
        </button>
        <span className="truncate text-center text-[13px] font-semibold capitalize text-text-primary">{label}</span>
        <button
          type="button"
          aria-label="Mes siguiente"
          className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-nav-hover"
          onClick={() => {
            const next = shiftMonth(view.year, view.month, 1);
            openMonth(next.year, next.month);
          }}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((day, index) => (
          <div key={`${day}-${index}`} className="py-1 text-[11px] font-medium text-text-tertiary">
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          const isToday = cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
          return (
            <button
              key={`${cell.year}-${cell.month}-${cell.day}-${cell.inMonth ? "in" : "out"}`}
              type="button"
              onClick={() => openMonth(cell.year, cell.month)}
              className={`mx-auto flex size-7 items-center justify-center rounded-full text-[12px] ${
                isToday
                  ? "bg-[#3545D6] font-semibold text-white"
                  : cell.inMonth
                    ? "text-text-primary hover:bg-nav-hover"
                    : "text-text-tertiary hover:bg-nav-hover"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
