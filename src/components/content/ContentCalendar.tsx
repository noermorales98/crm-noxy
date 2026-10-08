"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PUBLISH_STATUSES,
  parsePublishStatus,
  publishStatusColor,
  publishStatusLabel,
  type PublishListFilter,
  type PublishStatus,
} from "@/src/lib/content-publish";

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
  editorNote?: string | null;
  editorNotes?: { id: string; body: string; createdAt: string }[];
  publishStatus?: string | null;
  uploadedAt?: string | null;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  notifiedAt: string | null;
  clientId?: string;
  clientName?: string;
  clientColor?: string;
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
.ncc-weekdays,.ncc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--line);}
.ncc-weekdays{margin-bottom:0;}
.ncc-weekdays div{text-align:center;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:6px 0;background:var(--paper);}
.ncc-day{background:#fff;border:none;border-radius:0;min-height:108px;padding:4px 4px 4px;position:relative;display:flex;flex-direction:column;gap:2px;}
.ncc-day.empty{background:var(--paper);border:none;}
.ncc-day.today{box-shadow:none;}
.ncc-dayhead{display:flex;align-items:center;gap:4px;flex:none;min-height:22px;margin:0 0 2px 2px;}
.ncc-daynum{font-family:"Open Sauce Two",system-ui,sans-serif;font-size:12px;font-weight:500;color:var(--ink);opacity:1;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex:none;}
.ncc-day.today .ncc-daynum{background:var(--terracotta);color:#fff;}
.ncc-hoy-word{font-size:11px;font-weight:600;color:var(--terracotta);line-height:1;}
.ncc-day.editable{cursor:pointer;}
.ncc-day-items{display:flex;flex-direction:column;gap:2px;flex:1;min-height:0;overflow:hidden;}
.ncc-day-items.is-dots{flex-direction:row;flex-wrap:wrap;align-content:flex-start;align-items:flex-start;gap:5px;padding:4px 2px;}
.ncc-event{flex:1;min-height:0;width:100%;border:none;border-radius:8px;padding:4px 6px;text-align:left;cursor:pointer;font-family:"Open Sauce Two",system-ui,sans-serif;overflow:hidden;display:flex;flex-direction:column;align-items:stretch;-webkit-tap-highlight-color:transparent;}
.ncc-event-body{min-width:0;flex:1;display:flex;flex-direction:column;}
.ncc-event-time{display:block;font-size:11px;font-weight:400;line-height:1.2;opacity:.85;}
.ncc-event-title{display:block;font-size:12px;font-weight:600;line-height:1.25;overflow:hidden;}
.ncc-status-capsule{display:inline-flex;align-self:flex-start;margin-top:3px;padding:0 6px;border-radius:999px;border:1px solid currentColor;background:transparent;font-size:11px;font-weight:500;line-height:16px;letter-spacing:0.01em;}
.ncc-dot{width:10px;height:10px;border-radius:50%;border:none;padding:0;cursor:pointer;flex:none;}
.ncc-add-day{font-size:10px;color:var(--muted);text-align:center;padding:0;opacity:0;transition:opacity .15s;flex:none;}
.ncc-day.editable:hover .ncc-add-day{opacity:1;}
@media (max-width:640px){
  .ncc-weekdays div{font-size:10px;letter-spacing:0;}
  .ncc-day{min-height:72px;padding:3px 2px;}
  .ncc-daynum{width:20px;height:20px;font-size:11px;}
  .ncc-event-title{font-size:11px;}
  .ncc-add-day{display:none;}
  .ncc-fill .ncc-day{padding:2px 1px;}
  .ncc-fill .ncc-dayhead{min-height:16px;margin:0;}
  .ncc-fill .ncc-daynum{width:16px;height:16px;font-size:10px;}
  .ncc-fill .ncc-hoy-word,.ncc-fill .ncc-event-time,.ncc-fill .ncc-status-capsule{display:none;}
  .ncc-fill .ncc-day-items{flex:1;min-height:0;height:100%;}
  .ncc-fill .ncc-event{flex:1 1 0;align-self:stretch;height:auto;min-height:0;padding:2px 3px;border-radius:6px;}
  .ncc-fill .ncc-event-title{font-size:10px;white-space:normal;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;}
  .ncc-fill .ncc-dot{width:12px;height:12px;}
}
.ncc-overlay{position:fixed;inset:0;background:rgba(11,11,24,0.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60;}
.ncc-modal{background:var(--paper);max-width:960px;width:100%;max-height:calc(100vh - 40px);overflow:hidden;display:flex;flex-direction:column;border-radius:12px;position:relative;border:1px solid var(--line);box-shadow:0 16px 40px rgba(11,11,24,0.22);font-family:"Open Sauce Two",system-ui,sans-serif;color:var(--ink);}
.ncc-modal-head{position:relative;flex:none;min-height:56px;z-index:2;}
.ncc-modal-body{overflow:hidden;flex:1;min-height:0;padding:4px 28px 24px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,0.85fr);gap:28px;align-items:start;}
.ncc-modal-body.is-single{grid-template-columns:minmax(0,1fr);}
.ncc-modal-col{min-width:0;max-height:calc(100vh - 140px);overflow:auto;}
.ncc-advanced-btn{border:none;background:transparent;color:var(--muted);font-size:13px;font-weight:600;min-height:44px;padding:8px 0;cursor:pointer;font-family:inherit;}
.ncc-note-entry{position:relative;padding:8px 32px 8px 0;border-bottom:1px solid var(--line);}
.ncc-note-entry p{margin:0;font-size:14px;line-height:1.5;white-space:pre-line;}
.ncc-note-when{display:block;margin-top:4px;font-size:11px;color:var(--muted);}
.ncc-note-more{position:absolute;top:4px;right:0;width:28px;height:28px;border:none;border-radius:8px;background:transparent;color:var(--muted);font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;}
.ncc-note-more:hover{background:var(--paper-2);color:var(--ink);}
.ncc-note-menu{position:absolute;top:32px;right:0;min-width:140px;background:var(--paper);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 28px rgba(11,11,24,0.16);padding:4px;z-index:6;}
.ncc-note-menu button{display:block;width:100%;text-align:left;border:none;background:transparent;border-radius:8px;padding:8px 10px;min-height:44px;font-size:14px;color:var(--ink);cursor:pointer;font-family:inherit;}
.ncc-note-menu button:hover{background:var(--paper-2);}
.ncc-note-menu button.is-danger{color:#b42318;}
.ncc-note-actions{display:flex;gap:16px;margin-top:2px;}
.ncc-note-actions button{border:none;background:transparent;padding:0;min-height:44px;font-size:13px;font-weight:600;color:var(--terracotta);cursor:pointer;font-family:inherit;}
.ncc-kind-badge{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#fff;padding:5px 11px;border-radius:20px;margin-bottom:14px;}
.ncc-fecha{color:var(--muted);font-size:13px;margin-bottom:2px;text-transform:capitalize;}
.ncc-modal h2{font-family:"Open Sauce Two",system-ui,sans-serif;font-weight:500;font-size:24px;margin:0 0 14px;line-height:1.25;}
.ncc-block{margin-bottom:16px;}
.ncc-block h3{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--terracotta);margin:0 0 6px;font-weight:700;}
.ncc-block p{margin:0;font-size:14.5px;line-height:1.6;white-space:pre-line;}
.ncc-ideas-block{background:var(--paper-2);border:1px solid var(--line);border-radius:12px;padding:14px 14px 12px;}
.ncc-hooks-list{margin:0;padding-left:18px;}
.ncc-hooks-list li{font-size:14px;line-height:1.6;margin-bottom:4px;}
.ncc-close-btn,.ncc-more-btn{position:absolute;top:12px;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--paper-2);font-size:16px;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.ncc-close-btn{right:12px;}
.ncc-more-btn{left:12px;letter-spacing:0.02em;font-weight:700;}
.ncc-more-menu{position:absolute;top:50px;left:12px;min-width:160px;background:var(--paper);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 28px rgba(11,11,24,0.16);padding:4px;z-index:5;}
.ncc-more-menu button{display:block;width:100%;text-align:left;border:none;background:transparent;border-radius:8px;padding:8px 10px;font-size:14px;color:var(--ink);cursor:pointer;font-family:inherit;}
.ncc-more-menu button:hover{background:var(--paper-2);}
.ncc-more-menu button.is-danger{color:#b42318;}
.ncc-fill{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;}
.ncc-root.ncc-root-fit{min-height:0;height:100%;}
.ncc-fill .ncc-weekdays{flex:none;}
.ncc-fill .ncc-grid{flex:1;min-height:0;grid-template-rows:repeat(var(--ncc-weeks, 6), minmax(0, 1fr));}
.ncc-fill .ncc-day{min-height:0;height:100%;overflow:hidden;}
@media (max-width:720px){
  .ncc-modal{border-radius:14px;max-height:calc(100vh - 24px);}
  .ncc-modal-body{grid-template-columns:minmax(0,1fr);padding:4px 18px 20px;overflow-y:auto;}
  .ncc-modal-col{max-height:none;overflow:visible;}
  .ncc-modal h2{font-size:20px;}
}
`;

// Open Sauce Two is loaded once by the application shell.
export const CALENDAR_FONTS = null;

// ─── Grid del mes ─────────────────────────────────────────────────────────────

function inkOn(color: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return "#ffffff";
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 160 ? "#0B0B18" : "#ffffff";
}

export function ContentMonthGrid({
  year,
  month, // 0-based
  items,
  editable = false,
  onItemClick,
  onDayClick,
  fill = false,
}: {
  year: number;
  month: number;
  items: ContentItemData[];
  editable?: boolean;
  onItemClick?: (item: ContentItemData) => void;
  onDayClick?: (dateStr: string) => void;
  fill?: boolean;
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
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);
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
        <div className="ncc-dayhead">
          <div className="ncc-daynum">{d}</div>
          {d === todayDay && <span className="ncc-hoy-word">Hoy</span>}
        </div>
        <div className={`ncc-day-items${dayItems.length > 2 ? " is-dots" : ""}`}>
        {dayItems.length > 2
          ? dayItems.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.video;
              const color = item.clientColor || meta.color;
              const showStatus = Boolean(item.publishStatus);
              const statusName = showStatus ? publishStatusLabel(item.publishStatus) : "";
              const label = `${item.clientName ? `${item.clientName}: ` : ""}${item.title}${statusName ? `. ${statusName}` : ""}`;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="ncc-dot"
                  style={{ background: color }}
                  aria-label={label}
                  title={label}
                  onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                />
              );
            })
          : dayItems.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.video;
              const color = item.clientColor || meta.color;
              const ink = inkOn(color);
              const showStatus = Boolean(item.publishStatus);
              const statusName = showStatus ? publishStatusLabel(item.publishStatus) : "";
              const label = `${item.clientName ? `${item.clientName}: ` : ""}${item.title}${statusName ? `. ${statusName}` : ""}`;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="ncc-event"
                  style={{ background: color, color: ink }}
                  aria-label={label}
                  onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                >
                  <span className="ncc-event-body">
                    {item.time && <span className="ncc-event-time">{item.time}</span>}
                    <span className="ncc-event-title">
                      {item.clientName ? `${item.clientName}: ` : ""}
                      {item.title}
                    </span>
                    {showStatus && <span className="ncc-status-capsule">{statusName}</span>}
                  </span>
                </button>
              );
            })}
        </div>
        {editable && <div className="ncc-add-day">+ Agregar</div>}
      </div>
    );
  }

  const grid = (
    <>
      <div className="ncc-weekdays">
        {DIAS_SEMANA.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="ncc-grid">{cells}</div>
    </>
  );

  if (!fill) return grid;
  return (
    <div className="ncc-fill" style={{ ["--ncc-weeks" as string]: weekCount }}>
      {grid}
    </div>
  );
}

// ─── Modal de detalle (solo lectura; acciones por slot) ──────────────────────

const FILTER_OPTIONS: { id: PublishListFilter; label: string; dot: string | null }[] = [
  { id: "todas", label: "Todas", dot: null },
  ...PUBLISH_STATUSES.map((status) => ({
    id: status,
    label: publishStatusLabel(status),
    dot: publishStatusColor(status),
  })),
];

const filterChipClass = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 rounded-full border-0 px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#3545D6]/35 sm:min-h-8 ${
    active
      ? "bg-white font-semibold text-[#0B0B18] shadow-[0_1px_3px_rgba(11,11,24,0.12)]"
      : "bg-transparent font-medium text-[#6B7184] hover:text-[#0B0B18]"
  }`;

export function CalendarFilterBar({
  status,
  onStatus,
  clients,
  clientId,
  onClient,
}: {
  status: PublishListFilter;
  onStatus: (value: PublishListFilter) => void;
  clients?: { id: string; name: string; color: string }[];
  clientId?: string | null;
  onClient?: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden sm:block">
        <PublishStatusFilter value={status} onChange={onStatus} />
      </div>
      <div className="mb-2 shrink-0 sm:hidden">
        <button
          type="button"
          className="min-h-11 rounded-full bg-white px-4 text-[13px] font-semibold text-[#0B0B18] shadow-[0_1px_3px_rgba(11,11,24,0.12)]"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Filtrar
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end bg-[rgba(11,11,24,0.4)] sm:hidden" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-[20px] bg-[#F5F6FB] px-4 pb-8 pt-4"
            style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[13px] font-semibold text-[#0B0B18]">Estado</p>
            <div className="flex flex-wrap gap-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={status === option.id}
                  onClick={() => onStatus(option.id)}
                  className={filterChipClass(status === option.id)}
                >
                  {option.dot && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: option.dot }} />}
                  {option.label}
                </button>
              ))}
            </div>
            {clients && onClient && (
              <>
                <p className="mb-2 mt-5 text-[13px] font-semibold text-[#0B0B18]">Cliente</p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" aria-pressed={clientId == null} onClick={() => onClient(null)} className={filterChipClass(clientId == null)}>
                    Todos
                  </button>
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      aria-pressed={clientId === client.id}
                      onClick={() => onClient(clientId === client.id ? null : client.id)}
                      className={filterChipClass(clientId === client.id)}
                    >
                      <i className="inline-block size-2 shrink-0 rounded-full" style={{ background: client.color }} />
                      {client.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              className="mt-5 min-h-11 w-full rounded-full bg-[#0B0B18] text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PublishStatusFilter({
  value,
  onChange,
}: {
  value: PublishListFilter;
  onChange: (value: PublishListFilter) => void;
}) {
  return (
    <div
      className="mb-3 inline-flex max-w-full shrink-0 flex-wrap gap-1"
      style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}
    >
      {FILTER_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={filterChipClass(active)}
          >
            {option.dot && (
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: option.dot }} />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function editorNoteEntries(item: ContentItemData): { id: string; body: string; createdAt: string }[] {
  if (item.editorNotes && item.editorNotes.length > 0) return item.editorNotes;
  if (item.editorNote?.trim()) {
    return [{ id: `legacy-${item.id}`, body: item.editorNote.trim(), createdAt: "" }];
  }
  return [];
}

function formatNoteWhen(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function uploadDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} de ${MESES[date.getMonth()]}`;
}

const noteFieldStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "#fff",
  color: "var(--ink)",
  padding: "8px 10px",
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: "inherit",
  resize: "vertical",
};

function EditorNoteField({
  item,
  onCreate,
  onUpdate,
  onDelete,
}: {
  item: ContentItemData;
  onCreate: (note: string) => Promise<void>;
  onUpdate: (id: string, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const history = editorNoteEntries(item);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNote("");
    setEditingId(null);
    setMenuId(null);
    setDraft("");
    setError("");
  }, [item.id]);

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError("");
    try {
      await action();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ncc-block">
      <h3>Nota de la editora</h3>
      {history.length > 0 && (
        <div>
          {history.map((entry) => (
            <div key={entry.id} className="ncc-note-entry">
              {editingId !== entry.id && (
                <>
                  <button
                    type="button"
                    className="ncc-note-more"
                    aria-label="Acciones de la nota"
                    aria-expanded={menuId === entry.id}
                    onClick={() => setMenuId((current) => (current === entry.id ? null : entry.id))}
                  >
                    ⋯
                  </button>
                  {menuId === entry.id && (
                    <div className="ncc-note-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuId(null);
                          setEditingId(entry.id);
                          setDraft(entry.body);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        disabled={saving}
                        onClick={() => {
                          setMenuId(null);
                          void run(() => onDelete(entry.id));
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </>
              )}
              {editingId === entry.id ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    style={noteFieldStyle}
                  />
                  <div className="ncc-note-actions">
                    <button
                      type="button"
                      disabled={saving || !draft.trim()}
                      onClick={() => void run(async () => {
                        await onUpdate(entry.id, draft.trim());
                        setEditingId(null);
                        setDraft("");
                      })}
                    >
                      Guardar
                    </button>
                    <button type="button" onClick={() => { setEditingId(null); setDraft(""); }}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>{entry.body}</p>
                  {formatNoteWhen(entry.createdAt) && (
                    <span className="ncc-note-when">{formatNoteWhen(entry.createdAt)}</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Anota lo que falta, el enlace o cualquier detalle de la publicación"
        style={noteFieldStyle}
      />
      <button
        type="button"
        onClick={() => void run(async () => {
          await onCreate(note.trim());
          setNote("");
        })}
        disabled={saving || !note.trim()}
        style={{
          marginTop: 8,
          border: "none",
          borderRadius: 8,
          background: "var(--terracotta)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          minHeight: 44,
          padding: "8px 12px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {saving ? "Guardando…" : "Guardar nota"}
      </button>
      {error && <p style={{ color: "#b42318", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function AdvancedDisclosure({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button type="button" className="ncc-advanced-btn" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        Avanzado
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function PublishStatusPicker({
  value,
  disabled,
  onSelect,
}: {
  value: string | null | undefined;
  disabled?: boolean;
  onSelect: (status: PublishStatus) => void;
}) {
  const current = parsePublishStatus(value);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {PUBLISH_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(status)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            border: "none",
            background: current === status ? "#fff" : "transparent",
            boxShadow: current === status ? "0 1px 3px rgba(11,11,24,0.12)" : "none",
            fontWeight: current === status ? 600 : 500,
            fontSize: 12,
            padding: "6px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            color: "var(--ink)",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: publishStatusColor(status),
              flex: "none",
            }}
          />
          {publishStatusLabel(status)}
        </button>
      ))}
    </div>
  );
}

function PublishStatusField({
  item,
  onSave,
}: {
  item: ContentItemData;
  onSave: (status: PublishStatus) => Promise<void>;
}) {
  const current = parsePublishStatus(item.publishStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (status: PublishStatus) => {
    setSaving(true);
    setError("");
    try {
      await onSave(status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el estado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ncc-block">
      <h3>Estado de la publicación</h3>
      <div style={{ marginTop: 6 }}>
        <PublishStatusPicker value={current} disabled={saving} onSelect={(status) => void save(status)} />
      </div>
      {error && <p style={{ color: "#b42318", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export function ContentItemModal({
  item,
  onClose,
  actions,
  showReminder = false,
  showInternalNote = true,
  suppressEditorNote = false,
  onEdit,
  onDelete,
  onSaveEditorNote,
  onUpdateEditorNote,
  onDeleteEditorNote,
  onSavePublishStatus,
  advanced,
  showAdvanced = true,
}: {
  item: ContentItemData;
  onClose: () => void;
  actions?: React.ReactNode;
  showReminder?: boolean;
  showInternalNote?: boolean;
  suppressEditorNote?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSaveEditorNote?: (note: string) => Promise<void>;
  onUpdateEditorNote?: (id: string, note: string) => Promise<void>;
  onDeleteEditorNote?: (id: string) => Promise<void>;
  onSavePublishStatus?: (status: PublishStatus) => Promise<void>;
  advanced?: React.ReactNode;
  showAdvanced?: boolean;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.video;
  const hooksAlt = parseHooksAlt(item.hooksAlt);
  const isFlyerLike = item.type === "flyer" || item.type === "historia";
  const isEntrega = item.type === "entrega";
  const [menuOpen, setMenuOpen] = useState(false);
  const showNotes = Boolean(onSaveEditorNote && onUpdateEditorNote && onDeleteEditorNote && !suppressEditorNote);
  const hasIdeas = hooksAlt.length > 0 || Boolean(item.tips);
  const hasAdvancedContent = Boolean(
    item.time
    || item.caption
    || (showReminder && item.reminderEnabled)
    || advanced,
  );
  const showAdvancedSection = showAdvanced && hasAdvancedContent;
  const ideas = hasIdeas ? (
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
  ) : null;

  return (
    <div className="ncc-overlay" onClick={onClose}>
      <div className="ncc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ncc-modal-head">
          {(onEdit || onDelete) && (
            <>
              <button
                type="button"
                className="ncc-more-btn"
                aria-label="Más acciones"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="ncc-more-menu">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit();
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <button className="ncc-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className={`ncc-modal-body${showNotes || hasIdeas || showAdvancedSection ? "" : " is-single"}`} onClick={() => menuOpen && setMenuOpen(false)}>
        <div className="ncc-modal-col">
        <div className="ncc-kind-badge" style={{ background: item.clientColor || meta.color }}>{meta.label}</div>
        {item.clientName && (
          <div className="ncc-fecha" style={{ color: item.clientColor, fontWeight: 700, textTransform: "none" }}>
            {item.clientName}
          </div>
        )}
        <div className="ncc-fecha">{longDateLabel(item.date)}</div>
        <h2>{item.title}</h2>
        {onSavePublishStatus && (
          <PublishStatusField item={item} onSave={onSavePublishStatus} />
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

        {item.cta && (
          <div className="ncc-block">
            <h3>Llamado a la acción</h3>
            <p>{item.cta}</p>
          </div>
        )}

        {item.uploadedAt && (
          <div className="ncc-block">
            <h3>Fecha de subida</h3>
            <p>{uploadDayLabel(item.uploadedAt)}</p>
          </div>
        )}

        {showInternalNote && item.note && (
          <div className="ncc-block">
            <h3>Nota interna</h3>
            <p>{item.note}</p>
          </div>
        )}

        {actions && (
          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {actions}
          </div>
        )}
        </div>
        {(showNotes || hasIdeas || showAdvancedSection) && (
          <div className="ncc-modal-col">
            {ideas}
            {showNotes && onSaveEditorNote && onUpdateEditorNote && onDeleteEditorNote && (
              <EditorNoteField
                item={item}
                onCreate={onSaveEditorNote}
                onUpdate={onUpdateEditorNote}
                onDelete={onDeleteEditorNote}
              />
            )}
            {showAdvancedSection && (
              <AdvancedDisclosure>
                {item.time && (
                  <div className="ncc-block">
                    <h3>Hora de publicación</h3>
                    <p>{item.time} — pico de actividad en redes</p>
                  </div>
                )}
                {item.caption && (
                  <div className="ncc-block">
                    <h3>{isFlyerLike ? "Frase" : "Texto para publicar"}</h3>
                    <p>{item.caption}</p>
                  </div>
                )}
                {showReminder && item.reminderEnabled && (
                  <div className="ncc-block">
                    <h3>Recordatorio WhatsApp</h3>
                    <p>
                      {(item.reminderDaysBefore ?? 1) === 0
                        ? "El mismo día de la publicación"
                        : (item.reminderDaysBefore ?? 1) === 1
                          ? "1 día antes"
                          : `${item.reminderDaysBefore} días antes`}
                      {item.notifiedAt ? " · ya enviado" : " · pendiente"}
                    </p>
                  </div>
                )}
                {advanced}
              </AdvancedDisclosure>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
