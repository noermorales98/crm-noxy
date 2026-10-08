"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CALENDAR_CSS, CALENDAR_FONTS, ContentMonthGrid, ContentItemModal,
  monthLabel, type ContentItemData,
} from "./ContentCalendar";

export default function PublicCalendarView({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
  clientKind: string;
  clientDescription: string | null;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [items, setItems] = useState<ContentItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<ContentItemData | null>(null);

  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/public/content/${token}?month=${monthParam}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, monthParam]);

  useEffect(load, [load]);

  const moveMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const goToday = () => {
    const today = new Date();
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  };

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F6FB] px-6">
        <p className="text-sm text-[#6B7184]" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
          No se pudo cargar el calendario. Verifica el enlace.
        </p>
      </div>
    );
  }

  const navBtn = "flex size-11 shrink-0 items-center justify-center rounded-lg text-[#0B0B18]";

  return (
    <div className="ncc-root ncc-root-fit flex min-h-0 flex-col bg-[#F5F6FB]" style={{ height: "100dvh" }}>
      {CALENDAR_FONTS}
      <style>{CALENDAR_CSS}</style>

      <header
        className="flex shrink-0 items-center gap-0.5 px-2 pb-1 pt-[max(8px,env(safe-area-inset-top))]"
        style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}
      >
        <button type="button" className={`${navBtn} text-lg`} aria-label="Mes anterior" onClick={() => moveMonth(-1)}>
          ‹
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-base font-bold capitalize text-[#0B0B18]">{monthLabel(cursor.year, cursor.month)}</p>
          <p className="truncate text-xs font-medium text-[#6B7184]">{clientName}</p>
        </div>
        <button type="button" className={`${navBtn} text-lg`} aria-label="Mes siguiente" onClick={() => moveMonth(1)}>
          ›
        </button>
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-semibold text-[#0B0B18]"
          onClick={goToday}
        >
          Hoy
        </button>
      </header>

      <div className="min-h-0 flex-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="h-full animate-pulse rounded-[14px] bg-white" />
        ) : (
          <ContentMonthGrid
            year={cursor.year}
            month={cursor.month}
            items={items}
            fill
            onItemClick={setSelected}
          />
        )}
      </div>

      {selected && (
        <ContentItemModal
          item={selected}
          onClose={() => setSelected(null)}
          showInternalNote={false}
          suppressEditorNote
          showAdvanced={false}
        />
      )}
    </div>
  );
}
