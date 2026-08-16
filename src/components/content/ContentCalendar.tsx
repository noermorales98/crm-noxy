"use client";

import { useMemo } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ContentItemData = {
  id: string;
  date: string; // ISO
  type: string; // video | reel | flyer | historia | entrega | edicion
  title: string;
  time: string | null;
  hook: string | null;
  hooksAlt: string | null; // JSON array
  script: string | null;
  caption: string | null;
  cta: string | null;
  tips: string | null;
  note: string | null;
  notifiedAt: string | null;
};

export const TYPE_META: Record<string, { label: string; color: string }> = {
  video: { label: "Video", color: "#3545D6" },
  reel: { label: "Reel", color: "#9B7EDE" },
  flyer: { label: "Flyer", color: "#6E7F5C" },
  historia: { label: "Historia", color: "#4A7BA6" },
  entrega: { label: "Entrega / grabación", color: "#C9973B" },
  edicion: { label: "En edición", color: "#6B7184" },
};

export function parseHooksAlt(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((h) => typeof h === "string") : [];
  } catch {
    return [];
  }
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function monthLabel(year: number, month: number): string {
  return `${MESES[month]} ${year}`;
}

export function longDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${DIAS_LARGO[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

// ─── CSS (estilo del calendario de referencia, clases con prefijo ncc-) ──────

export const CALENDAR_CSS = `
.ncc-root, .ncc-overlay, .ncc-modal{
  --ink:#0B0B18; --paper:#F5F6FB; --paper-2:#EBEDFA;
  --gold:#C9973B; --terracotta:#3545D6; --sage:#6E7F5C;
  --line:#DCDFE6; --muted:#6B7184;
}
.ncc-root{
  background:var(--paper); color:var(--ink);
  font-family:"Open Sauce Two",system-ui,sans-serif; min-height:100%;
  -webkit-font-smoothing:antialiased; border-radius:inherit;
}
.ncc-root *{box-sizing:border-box;}
.ncc-weekdays,.ncc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
.ncc-weekdays{margin-bottom:8px;}
.ncc-weekdays div{text-align:center;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);font-weight:600;padding-bottom:4px;}
.ncc-day{background:var(--paper-2);border:1px solid var(--line);border-radius:14px;min-height:104px;padding:10px 8px;position:relative;display:flex;flex-direction:column;gap:6px;}
.ncc-day.empty{background:transparent;border:none;}
.ncc-day.today{border:2px solid var(--terracotta);box-shadow:0 0 0 3px rgba(53,69,214,0.12);}
.ncc-today-label{position:absolute;top:8px;right:8px;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:var(--terracotta);font-weight:700;}
.ncc-daynum{font-family:"Open Sauce Two",system-ui,sans-serif;font-size:18px;color:var(--ink);opacity:0.75;}
.ncc-day.editable{cursor:pointer;}
.ncc-day.editable:hover{border-color:var(--gold);}
.ncc-tag{border:none;text-align:left;border-radius:9px;padding:8px 9px;font-size:12.5px;line-height:1.3;font-weight:600;color:#fff;cursor:pointer;font-family:"Open Sauce Two",system-ui,sans-serif;-webkit-tap-highlight-color:transparent;transition:transform .12s ease;width:100%;}
.ncc-tag:active{transform:scale(0.97);}
.ncc-tag .ncc-kind{display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;margin-bottom:2px;font-weight:700;}
.ncc-edit-note{font-size:11.5px;color:var(--muted);font-style:italic;line-height:1.3;padding:2px 1px;}
.ncc-day.en-edicion{background:repeating-linear-gradient(135deg,var(--paper-2),var(--paper-2) 8px,#ECE3D3 8px,#ECE3D3 16px);}
.ncc-add-day{font-size:10px;color:var(--muted);text-align:center;padding:2px;opacity:0;transition:opacity .15s;}
.ncc-day.editable:hover .ncc-add-day{opacity:1;}
@media (max-width:640px){
  .ncc-weekdays div{font-size:10px;}
  .ncc-day{min-height:88px;border-radius:10px;padding:7px 5px;gap:4px;}
  .ncc-daynum{font-size:14px;}
  .ncc-tag{font-size:10.5px;padding:6px 6px;border-radius:7px;}
  .ncc-tag .ncc-kind{font-size:8.5px;}
  .ncc-add-day{display:none;}
}
.ncc-overlay{position:fixed;inset:0;background:rgba(11,11,24,0.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60;}
.ncc-modal{background:var(--paper);max-width:560px;width:100%;max-height:86vh;overflow-y:auto;border-radius:12px;padding:28px 26px 26px;position:relative;border:1px solid var(--line);box-shadow:0 16px 40px rgba(11,11,24,0.22);font-family:"Open Sauce Two",system-ui,sans-serif;color:var(--ink);}
.ncc-kind-badge{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#fff;padding:5px 11px;border-radius:20px;margin-bottom:14px;}
.ncc-fecha{color:var(--muted);font-size:13px;margin-bottom:2px;text-transform:capitalize;}
.ncc-modal h2{font-family:"Open Sauce Two",system-ui,sans-serif;font-weight:500;font-size:24px;margin:0 0 14px;line-height:1.25;}
.ncc-block{margin-bottom:16px;}
.ncc-block h3{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--terracotta);margin:0 0 6px;font-weight:700;}
.ncc-block p{margin:0;font-size:14.5px;line-height:1.6;white-space:pre-line;}
.ncc-ideas-block{background:var(--paper-2);border:1px solid var(--line);border-radius:12px;padding:14px 14px 12px;}
.ncc-hooks-list{margin:0;padding-left:18px;}
.ncc-hooks-list li{font-size:14px;line-height:1.6;margin-bottom:4px;}
.ncc-close-btn{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--paper-2);font-size:16px;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;}
@media (max-width:640px){
  .ncc-modal{padding:22px 18px 20px;border-radius:14px;}
  .ncc-modal h2{font-size:20px;}
}
`;

// Open Sauce Two is loaded once by the application shell.
export const CALENDAR_FONTS = null;

// ─── Grid del mes ─────────────────────────────────────────────────────────────

export function ContentMonthGrid({
  year,
  month, // 0-based
  items,
  editable = false,
  onItemClick,
  onDayClick,
}: {
  year: number;
  month: number;
  items: ContentItemData[];
  editable?: boolean;
  onItemClick?: (item: ContentItemData) => void;
  onDayClick?: (dateStr: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<number, ContentItemData[]>();
    for (const item of items) {
      const day = new Date(item.date).getUTCDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return map;
  }, [items]);

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // 0=Lun
  const today = new Date();
  const isCurrentMonth = today.getUTCFullYear() === year && today.getUTCMonth() === month;
  const todayDay = isCurrentMonth ? today.getUTCDate() : -1;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`e${i}`} className="ncc-day empty" />);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayItems = byDay.get(d) ?? [];
    const hasEdicionOnly = dayItems.length > 0 && dayItems.every((i) => i.type === "edicion");
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(
      <div
        key={d}
        className={`ncc-day ${d === todayDay ? "today" : ""} ${hasEdicionOnly ? "en-edicion" : ""} ${editable ? "editable" : ""}`}
        onClick={editable && onDayClick ? () => onDayClick(dateStr) : undefined}
      >
        {d === todayDay && <div className="ncc-today-label">HOY</div>}
        <div className="ncc-daynum">{d}</div>
        {dayItems.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.video;
          if (item.type === "edicion") {
            return (
              <button
                key={item.id}
                className="ncc-edit-note"
                style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
              >
                {item.title}
              </button>
            );
          }
          return (
            <button
              key={item.id}
              className="ncc-tag"
              style={{ background: meta.color }}
              onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
            >
              <span className="ncc-kind">{meta.label}{item.time ? ` · ${item.time}` : ""}</span>
              {item.title}
            </button>
          );
        })}
        {editable && <div className="ncc-add-day">+ Agregar</div>}
      </div>
    );
  }

  return (
    <>
      <div className="ncc-weekdays">
        {DIAS_SEMANA.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="ncc-grid">{cells}</div>
    </>
  );
}

// ─── Modal de detalle (solo lectura; acciones por slot) ──────────────────────

export function ContentItemModal({
  item,
  onClose,
  actions,
}: {
  item: ContentItemData;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.video;
  const hooksAlt = parseHooksAlt(item.hooksAlt);
  const isFlyerLike = item.type === "flyer" || item.type === "historia";
  const isEntrega = item.type === "entrega";

  return (
    <div className="ncc-overlay" onClick={onClose}>
      <div className="ncc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ncc-close-btn" onClick={onClose}>✕</button>
        <div className="ncc-kind-badge" style={{ background: meta.color }}>{meta.label}</div>
        <div className="ncc-fecha">{longDateLabel(item.date)}</div>
        <h2>{item.title}</h2>

        {item.time && (
          <div className="ncc-block">
            <h3>Hora recomendada</h3>
            <p>{item.time} — pico de actividad en redes</p>
          </div>
        )}

        {isEntrega && (
          <div className="ncc-block">
            <h3>Qué hacer este día</h3>
            <p>Grabar el contenido crudo (sin editar) de este tema y enviarlo.</p>
          </div>
        )}

        {item.hook && (
          <div className="ncc-block">
            <h3>Hook (primeros 3 seg)</h3>
            <p>{item.hook}</p>
          </div>
        )}

        {item.script && (
          <div className="ncc-block">
            <h3>{isEntrega ? "Qué decir" : "Guion"}</h3>
            <p>{item.script}</p>
          </div>
        )}

        {item.caption && !isFlyerLike && (
          <div className="ncc-block">
            <h3>Texto para publicar</h3>
            <p>{item.caption}</p>
          </div>
        )}

        {isFlyerLike && item.caption && (
          <div className="ncc-block">
            <h3>Frase</h3>
            <p>{item.caption}</p>
          </div>
        )}

        {item.cta && (
          <div className="ncc-block">
            <h3>Llamado a la acción</h3>
            <p>{item.cta}</p>
          </div>
        )}

        {item.note && (
          <div className="ncc-block">
            <h3>Nota</h3>
            <p>{item.note}</p>
          </div>
        )}

        {(hooksAlt.length > 0 || item.tips) && (
          <div className="ncc-block ncc-ideas-block">
            <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--terracotta)", margin: "0 0 6px", fontWeight: 700 }}>
              Ideas para grabar
            </h3>
            {hooksAlt.length > 0 && (
              <>
                <p style={{ marginBottom: 8, fontSize: 14.5 }}><strong>Otros hooks que puedes probar:</strong></p>
                <ul className="ncc-hooks-list">
                  {hooksAlt.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </>
            )}
            {item.tips && (
              <>
                <p style={{ marginTop: 10, marginBottom: 6, fontSize: 14.5 }}><strong>Sugerencias para grabar:</strong></p>
                <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>{item.tips}</p>
              </>
            )}
          </div>
        )}

        {actions && <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </div>
  );
}
