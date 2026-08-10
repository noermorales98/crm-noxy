"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CALENDAR_CSS, CALENDAR_FONTS, ContentMonthGrid, ContentItemModal,
  monthLabel, TYPE_META, type ContentItemData,
} from "./ContentCalendar";

export default function PublicCalendarView({
  token,
  clientName,
  clientKind,
  clientDescription,
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7F1] px-6">
        <p className="text-sm text-[#8A7F8F]" style={{ fontFamily: '"Work Sans",sans-serif' }}>
          No se pudo cargar el calendario. Verifica el enlace.
        </p>
      </div>
    );
  }

  const usedTypes = Array.from(new Set(items.map((i) => i.type))).filter((t) => TYPE_META[t]);

  return (
    <div className="ncc-root min-h-screen pb-14">
      {CALENDAR_FONTS}
      <style>{CALENDAR_CSS}</style>

      {/* Encabezado estilo referencia */}
      <div style={{ padding: "36px 24px 28px", textAlign: "center", position: "relative" }}>
        <div
          style={{
            fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--terracotta)", fontWeight: 600,
          }}
        >
          {clientKind === "cliente" ? "Calendario de contenido" : "Marca personal"}
          {clientDescription ? ` · ${clientDescription}` : ""}
        </div>
        <h1
          style={{
            fontFamily: '"Fraunces",serif', fontWeight: 500,
            fontSize: "clamp(28px,5vw,44px)", margin: "8px 0 6px",
          }}
        >
          {clientName}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
          Toca cada publicación para ver el detalle: qué grabar, el guion y las sugerencias.
        </p>
        <div style={{ width: 64, height: 2, background: "var(--gold)", margin: "18px auto 0" }} />
      </div>

      {/* Navegación de mes */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 16, marginBottom: 20, padding: "0 16px",
        }}
      >
        <button
          onClick={() => moveMonth(-1)}
          aria-label="Mes anterior"
          style={{
            width: 36, height: 36, borderRadius: 10, border: "1px solid var(--line)",
            background: "var(--paper-2)", color: "var(--ink)", cursor: "pointer", fontSize: 16,
          }}
        >
          ‹
        </button>
        <span
          style={{
            fontFamily: '"Fraunces",serif', fontWeight: 500,
            fontSize: "clamp(18px,4vw,24px)", textTransform: "capitalize", minWidth: 160, textAlign: "center",
          }}
        >
          {monthLabel(cursor.year, cursor.month)}
        </span>
        <button
          onClick={() => moveMonth(1)}
          aria-label="Mes siguiente"
          style={{
            width: 36, height: 36, borderRadius: 10, border: "1px solid var(--line)",
            background: "var(--paper-2)", color: "var(--ink)", cursor: "pointer", fontSize: 16,
          }}
        >
          ›
        </button>
      </div>

      {/* Leyenda */}
      {usedTypes.length > 0 && (
        <div
          style={{
            display: "flex", justifyContent: "center", gap: 22, flexWrap: "wrap",
            padding: "0 20px 24px", fontSize: 13,
          }}
        >
          {usedTypes.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <i
                style={{
                  width: 10, height: 10, borderRadius: "50%", display: "inline-block",
                  background: TYPE_META[t].color,
                }}
              />
              {TYPE_META[t].label}
            </span>
          ))}
        </div>
      )}

      {/* Calendario */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px" }}>
        {loading ? (
          <div style={{ height: 384, borderRadius: 14, background: "var(--paper-2)" }} className="animate-pulse" />
        ) : (
          <ContentMonthGrid
            year={cursor.year}
            month={cursor.month}
            items={items}
            onItemClick={setSelected}
          />
        )}
      </div>

      <footer style={{ textAlign: "center", padding: "32px 20px 0", color: "var(--muted)", fontSize: 12.5 }}>
        Calendario de {clientName} — {items.length} pieza(s) en {monthLabel(cursor.year, cursor.month)}.
      </footer>

      {selected && <ContentItemModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
