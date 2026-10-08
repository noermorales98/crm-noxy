"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiChatIcon, ArrowLeft01Icon, ArrowRight01Icon,
  Share01Icon, Delete01Icon, SentIcon, Copy01Icon,
  CheckmarkCircle01Icon, RefreshIcon,
} from "@hugeicons/core-free-icons";
import {
  CALENDAR_CSS, CALENDAR_FONTS, ContentMonthGrid, ContentItemModal, CalendarFilterBar, PublishStatusPicker,
  monthLabel, type ContentItemData,
} from "./ContentCalendar";
import { matchesPublishFilter, type PublishListFilter, type PublishStatus } from "@/src/lib/content-publish";
import { useHeader } from "@/src/context/HeaderContext";
import { formatMesParam, isCurrentMonth, parseMesParam, shiftMonth } from "@/src/lib/content-month";
import {
  reminderDaysLabel,
  reminderDaysSelectOptions,
} from "@/src/lib/content-reminder-options";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PhoneEntry = { id: string; label: string | null; phone: string; apiKey: string };

type ClientData = {
  id: string; name: string; kind: string; description: string | null;
  context: string | null; publicToken: string; phones: PhoneEntry[];
  reminderHour: number; reminderMinute: number; reminderDaysBefore: number;
};

type AiIdea = {
  date: string; type: string; title: string; time: string | null;
  hook: string | null; script: string | null; caption: string | null;
  cta: string | null; tips: string | null; week?: number;
};

const TYPE_OPTIONS = [
  { v: "video", label: "Video" },
  { v: "reel", label: "Reel" },
  { v: "flyer", label: "Flyer" },
  { v: "historia", label: "Historia" },
  { v: "entrega", label: "Entrega / grabación" },
  { v: "edicion", label: "En edición" },
];

const inputClass =
  "noxy-form-control";
const labelClass = "block text-xs font-medium text-text-secondary mb-1";

function ReminderWhenSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {reminderDaysSelectOptions(value).map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

// ─── Modal editor de pieza ────────────────────────────────────────────────────

export function ContentItemEditor({
  clientId,
  clientName,
  initial,
  defaultDate,
  defaultDaysBefore,
  sendHour,
  sendMinute,
  onClose,
  onSaved,
}: {
  clientId: string;
  clientName?: string;
  initial: ContentItemData | null;
  defaultDate: string;
  defaultDaysBefore: number;
  sendHour: number;
  sendMinute: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    date: initial ? initial.date.slice(0, 10) : defaultDate,
    type: initial?.type ?? "video",
    title: initial?.title ?? "",
    time: initial?.time ?? "",
    hook: initial?.hook ?? "",
    hooksAltText: initial?.hooksAlt ? (() => { try { return (JSON.parse(initial.hooksAlt) as string[]).join("\n"); } catch { return ""; } })() : "",
    script: initial?.script ?? "",
    caption: initial?.caption ?? "",
    cta: initial?.cta ?? "",
    tips: initial?.tips ?? "",
    note: initial?.note ?? "",
    publishStatus: (initial?.publishStatus ?? "pendiente") as PublishStatus,
    reminderEnabled: initial?.reminderEnabled ?? (initial?.type === "entrega"),
    reminderDaysBefore: initial?.reminderDaysBefore ?? defaultDaysBefore ?? 1,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        date: form.date, type: form.type, title: form.title,
        time: form.time || null, hook: form.hook || null,
        hooksAlt: form.hooksAltText.split("\n").map((s) => s.trim()).filter(Boolean),
        script: form.script || null, caption: form.caption || null,
        cta: form.cta || null, tips: form.tips || null, note: form.note || null,
        publishStatus: form.publishStatus,
        reminderEnabled: form.reminderEnabled,
        reminderDaysBefore: form.reminderDaysBefore,
      };
      const res = await fetch(initial ? `/api/content/items/${initial.id}` : `/api/content/clients/${clientId}/items`, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div
        className="relative bg-white w-full sm:max-w-xl rounded-t-surface sm:rounded-surface border border-border-subtle p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {initial ? "Editar pieza" : "Nueva pieza de contenido"}
          {clientName ? <span className="block text-sm font-medium text-text-secondary mt-1">{clientName}</span> : null}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Fecha *</label>
            <input type="date" className={inputClass} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => {
                const type = e.target.value;
                setForm((f) => ({
                  ...f,
                  type,
                  // Al marcar entrega, activar recordatorio si aún no hay uno
                  reminderEnabled: type === "entrega" ? true : f.reminderEnabled,
                }));
              }}
            >
              {TYPE_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Título *</label>
          <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Volver a creer en el amor" />
        </div>

        <div className="mb-3">
          <label className={labelClass}>Hook (primeros 3 segundos)</label>
          <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.hook} onChange={(e) => set("hook", e.target.value)} />
        </div>

        <div className="mb-3">
          <label className={labelClass}>Hooks alternativos <span className="font-normal opacity-70">(uno por línea)</span></label>
          <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.hooksAltText} onChange={(e) => set("hooksAltText", e.target.value)} />
        </div>

        <div className="mb-3">
          <label className={labelClass}>Guion / qué decir</label>
          <textarea className={`${inputClass} min-h-[90px] resize-y`} value={form.script} onChange={(e) => set("script", e.target.value)} />
        </div>

        <div className="mb-3 rounded-control border border-border-subtle bg-surface-app p-3">
          <label className={labelClass}>Estado de la publicación</label>
          <PublishStatusPicker
            value={form.publishStatus}
            onSelect={(status) => setForm((f) => ({ ...f, publishStatus: status }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Llamado a la acción</label>
            <input className={inputClass} value={form.cta} onChange={(e) => set("cta", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Nota interna</label>
            <input className={inputClass} value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Sugerencias para grabar</label>
          <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.tips} onChange={(e) => set("tips", e.target.value)} placeholder={"Luz de frente, nunca a contraluz.\nGraba 2-3 tomas y elige la más natural.\nHabla como si fuera a una sola persona."} />
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="min-h-11 text-sm font-semibold text-text-secondary"
            aria-expanded={advancedOpen}
          >
            Avanzado
          </button>
          {advancedOpen && (
            <div className="mt-2">
              <div className="mb-3">
                <label className={labelClass}>Hora de publicación <span className="font-normal opacity-70">(opcional)</span></label>
                <input className={inputClass} value={form.time} onChange={(e) => set("time", e.target.value)} placeholder="Ej. 11:00 am — pico de redes, no es el aviso" />
              </div>
              <div className="mb-3">
                <label className={labelClass}>Texto para publicar / frase</label>
                <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.caption} onChange={(e) => set("caption", e.target.value)} />
              </div>
              <div className="mb-3 rounded-control border border-border-subtle bg-surface-app p-3">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.reminderEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, reminderEnabled: e.target.checked }))}
                    className="rounded border-border-subtle"
                  />
                  <span className="font-medium">Recordatorio por WhatsApp</span>
                </label>
                <p className="text-xs text-text-secondary mt-1 mb-3">
                  Elige si avisamos el mismo día o con anticipación. La hora de envío se configura en el panel WhatsApp.
                </p>
                <div>
                  <label className={labelClass}>Cuándo avisar</label>
                  <ReminderWhenSelect
                    value={form.reminderDaysBefore}
                    onChange={(days) => setForm((f) => ({
                      ...f,
                      reminderDaysBefore: days,
                      reminderEnabled: true,
                    }))}
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    Se enviará {reminderDaysLabel(form.reminderDaysBefore).toLowerCase()} a las {String(sendHour).padStart(2, "0")}:{String(sendMinute).padStart(2, "0")}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="noxy-form-button flex-1 text-sm"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export default function ContentCalendarView({ client }: { client: ClientData }) {
  const { setConfig } = useHeader();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = new Date();
  const parsedMonth = parseMesParam(searchParams.get("mes"));
  const cursor = parsedMonth ?? { year: now.getFullYear(), month: now.getMonth() };
  const [items, setItems] = useState<ContentItemData[]>([]);
  const [statusFilter, setStatusFilter] = useState<PublishListFilter>("todas");
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<ContentItemData | null>(null);
  const [editing, setEditing] = useState<ContentItemData | null>(null);
  const [newForDate, setNewForDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ContentItemData | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [panel, setPanel] = useState<"share" | "phones" | "ai" | null>(null);

  // Compartir
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const publicUrl = `${origin}/calendario/${client.publicToken}?mes=${formatMesParam(cursor.year, cursor.month)}`;

  // WhatsApp
  const [phones, setPhones] = useState<PhoneEntry[]>(client.phones ?? []);
  const [phoneForm, setPhoneForm] = useState({ label: "", phone: "", apiKey: "" });
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [testBusyId, setTestBusyId] = useState<string | null>(null);
  const [phoneTestResult, setPhoneTestResult] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [reminderHour, setReminderHour] = useState(client.reminderHour ?? 8);
  const [reminderMinute, setReminderMinute] = useState(client.reminderMinute ?? 0);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(client.reminderDaysBefore ?? 1);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // IA
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiWarning, setAiWarning] = useState("");
  const [aiIdeas, setAiIdeas] = useState<AiIdea[]>([]);
  const [addedIdeas, setAddedIdeas] = useState<Set<number>>(new Set());
  const [aiPerWeek, setAiPerWeek] = useState(2);
  const [aiWeeks, setAiWeeks] = useState<number[]>([1, 2, 3, 4]);
  const [addAllBusy, setAddAllBusy] = useState(false);

  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const loadItems = useCallback(() => {
    setLoading(true);
    fetch(`/api/content/clients/${client.id}/items?month=${monthParam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [client.id, monthParam]);

  useEffect(loadItems, [loadItems]);

  const writeMonth = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isCurrentMonth(year, month)) params.delete("mes");
    else params.set("mes", formatMesParam(year, month));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const moveMonth = (delta: number) => {
    const next = shiftMonth(cursor.year, cursor.month, delta);
    writeMonth(next.year, next.month);
  };

  const goToday = () => {
    const today = new Date();
    writeMonth(today.getFullYear(), today.getMonth());
  };

  const moveRef = useRef(moveMonth);
  const todayRef = useRef(goToday);
  const createRef = useRef((date: string) => setNewForDate(date));
  moveRef.current = moveMonth;
  todayRef.current = goToday;
  createRef.current = (date: string) => setNewForDate(date);

  useEffect(() => {
    const label = monthLabel(cursor.year, cursor.month);
    const navBtn = "flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary";
    setConfig({
      title: (
        <div className="flex min-w-0 items-center gap-0.5">
          <button type="button" className={navBtn} aria-label="Mes anterior" onClick={() => moveRef.current(-1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>
          <span className="truncate px-1 text-base font-bold capitalize text-text-primary sm:text-lg">{label}</span>
          <button type="button" className={navBtn} aria-label="Mes siguiente" onClick={() => moveRef.current(1)}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
          <button type="button" className="min-h-11 px-2 text-sm font-semibold text-text-primary" onClick={() => todayRef.current()}>
            Hoy
          </button>
        </div>
      ),
      addButton: {
        label: "Agregar pieza",
        hideOnMobile: true,
        onClick: () => createRef.current(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`),
      },
    });
    return () => setConfig({});
  }, [cursor.year, cursor.month, setConfig]);

  const patchEditorNote = async (itemId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/content/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo guardar la nota");
    const editorNote = data.editorNote ?? null;
    const editorNotes = Array.isArray(data.editorNotes) ? data.editorNotes : [];
    setSelected((current) => (current && current.id === itemId ? { ...current, editorNote, editorNotes } : current));
    setItems((list) => list.map((it) => (it.id === itemId ? { ...it, editorNote, editorNotes } : it)));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia el enlace:", publicUrl);
    }
  };

  const regenerateLink = async () => {
    if (!confirm("¿Generar un enlace nuevo? El enlace anterior dejará de funcionar.")) return;
    await fetch(`/api/content/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateToken: true }),
    }).then((r) => r.json()).then(() => window.location.reload());
  };

  const addPhone = async () => {
    if (!phoneForm.phone.trim() || !phoneForm.apiKey.trim()) return;
    setPhoneBusy(true);
    const res = await fetch(`/api/content/clients/${client.id}/phones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(phoneForm),
    });
    if (res.ok) {
      const entry = await res.json();
      setPhones((p) => [...p, entry]);
      setPhoneForm({ label: "", phone: "", apiKey: "" });
    }
    setPhoneBusy(false);
  };

  const removePhone = async (id: string) => {
    await fetch(`/api/content/phones/${id}`, { method: "DELETE" });
    setPhones((p) => p.filter((x) => x.id !== id));
  };

  const testPhone = async (id: string) => {
    setTestBusyId(id);
    setPhoneTestResult(null);
    try {
      const res = await fetch(`/api/content/phones/${id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "CallMeBot rechazó el envío");
      setPhoneTestResult("✓ Mensaje de prueba enviado. Revisa WhatsApp.");
    } catch (e: unknown) {
      setPhoneTestResult(`✕ ${e instanceof Error ? e.message : "Error al enviar"}`);
    } finally {
      setTestBusyId(null);
    }
  };

  const saveReminderSchedule = async () => {
    setScheduleBusy(true);
    setScheduleResult(null);
    try {
      const res = await fetch(`/api/content/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderHour,
          reminderMinute,
          reminderDaysBefore,
          applyToEnabledItems: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el horario");
      setScheduleResult("✓ Avisos guardados (incluidas las piezas con recordatorio activado)");
      setItems((list) => list.map((item) => (
        item.reminderEnabled ? { ...item, reminderDaysBefore } : item
      )));
      setSelected((s) => (s?.reminderEnabled ? { ...s, reminderDaysBefore } : s));
    } catch (e: unknown) {
      setScheduleResult(`✕ ${e instanceof Error ? e.message : "Error al guardar"}`);
    } finally {
      setScheduleBusy(false);
    }
  };

  const notifyItem = async (item: ContentItemData) => {
    setNotifyBusy(true);
    setNotifyResult(null);
    try {
      const res = await fetch(`/api/content/clients/${client.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      const failedDetail = Array.isArray(data.results)
        ? data.results.filter((r: { ok: boolean; error?: string }) => !r.ok).map((r: { phone: string; error?: string }) => `${r.phone}: ${r.error || "falló"}`).join(" · ")
        : "";
      setNotifyResult(
        `✓ Aviso enviado a ${data.sent} número(s)${data.failed ? ` · ${data.failed} fallaron${failedDetail ? ` (${failedDetail})` : ""}` : ""}`,
      );
      if (data.sent > 0) {
        const nowIso = new Date().toISOString();
        setSelected((s) => (s && s.id === item.id ? { ...s, notifiedAt: nowIso } : s));
        setItems((list) => list.map((it) => (it.id === item.id ? { ...it, notifiedAt: nowIso } : it)));
      }
    } catch (e: unknown) {
      setNotifyResult(`✕ ${e instanceof Error ? e.message : "Error al enviar"}`);
    } finally {
      setNotifyBusy(false);
    }
  };

  const patchItemReminder = async (
    item: ContentItemData,
    patch: { reminderEnabled?: boolean; reminderDaysBefore?: number },
  ) => {
    const res = await fetch(`/api/content/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const updated = await res.json().catch(() => null);
    const next = {
      reminderEnabled: updated?.reminderEnabled ?? patch.reminderEnabled ?? item.reminderEnabled,
      reminderDaysBefore: updated?.reminderDaysBefore ?? patch.reminderDaysBefore ?? item.reminderDaysBefore,
    };
    setSelected((s) => (s && s.id === item.id ? { ...s, ...next } : s));
    setItems((list) => list.map((it) => (it.id === item.id ? { ...it, ...next } : it)));
  };

  const generateIdeas = async () => {
    setAiBusy(true); setAiError(""); setAiWarning(""); setAddedIdeas(new Set());
    try {
      const res = await fetch(`/api/content/clients/${client.id}/ai-ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction, month: monthParam, weeks: aiWeeks, perWeek: aiPerWeek }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ? `${data.error}\n${data.detail}` : data.error || "Error de IA");
      setAiIdeas(data.ideas ?? []);
      if ((data.ideas ?? []).length === 0) setAiError("La IA no propuso ideas. Prueba con otra instrucción.");
      if (Array.isArray(data.failedWeeks) && data.failedWeeks.length > 0) {
        setAiWarning(`No se pudieron generar las semanas: ${data.failedWeeks.map((f: any) => f.week).join(", ")}. Puedes reintentar solo esas semanas.`);
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const addIdeaByIndex = async (idx: number): Promise<boolean> => {
    const idea = aiIdeas[idx];
    if (!idea) return false;
    const res = await fetch(`/api/content/clients/${client.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...idea,
        hooksAlt: [],
        reminderEnabled: idea.type === "entrega",
        reminderDaysBefore,
      }),
    });
    if (res.ok) {
      setAddedIdeas((s) => new Set(s).add(idx));
      return true;
    }
    return false;
  };

  const addIdea = async (_idea: AiIdea, idx: number) => {
    if (await addIdeaByIndex(idx)) loadItems();
  };

  const addAllIdeas = async () => {
    setAddAllBusy(true);
    let any = false;
    for (let i = 0; i < aiIdeas.length; i++) {
      if (addedIdeas.has(i)) continue;
      if (await addIdeaByIndex(i)) any = true;
    }
    if (any) loadItems();
    setAddAllBusy(false);
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    await fetch(`/api/content/items/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    setDeleting(null);
    setSelected(null);
    loadItems();
  };

  const panelBtn = (id: "share" | "phones" | "ai", icon: any, label: string) => (
    <button
      type="button"
      onClick={() => setPanel((p) => (p === id ? null : id))}
      className={`hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors sm:flex sm:text-sm ${
        panel === id
          ? "border-action-primary bg-nav-active text-action-primary font-semibold"
          : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"
      }`}
    >
      <HugeiconsIcon icon={icon} size={14} color={panel === id ? "#3545D6" : "#0B0B18"} />
      {label}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-app pb-24 lg:pb-0">
      {CALENDAR_FONTS}
      <style>{CALENDAR_CSS}</style>

      <div className="ncc-root ncc-root-fit flex min-h-0 w-full flex-1 flex-col px-3 py-2 sm:px-4">
        <div className="flex shrink-0 items-start justify-between gap-2" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
          <div className="min-w-0 flex-1">
            <p className="mb-2 hidden truncate text-sm font-semibold text-text-primary sm:block">{client.name}</p>
            <div className="mb-2 hidden flex-wrap items-center gap-2 sm:flex">
              {panelBtn("share", Share01Icon, "Compartir")}
              {panelBtn("phones", SentIcon, `WhatsApp (${phones.length})`)}
              {panelBtn("ai", AiChatIcon, "Ideas con IA")}
            </div>
            <CalendarFilterBar status={statusFilter} onStatus={setStatusFilter} />
          </div>
        </div>

        {/* Panel: compartir */}
        {panel === "share" && (
          <div className="mb-2 max-h-[40vh] shrink-0 overflow-y-auto rounded-surface border border-border-subtle bg-white p-4" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
            <p className="text-sm font-semibold text-text-primary mb-1">Enlace público del calendario</p>
            <p className="text-xs text-text-secondary mb-3">
              Mándale este enlace al cliente: verá el calendario (sin poder editarlo) con qué debe grabar y las sugerencias.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={publicUrl} className={`${inputClass} flex-1 text-xs`} onFocus={(e) => e.target.select()} />
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 sm:flex-none flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-control bg-action-primary text-action-primary-foreground font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
                >
                  <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : Copy01Icon} size={14} color="white" />
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={regenerateLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-sidebar transition-colors"
                  title="Generar un enlace nuevo (invalida el anterior)"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel: WhatsApp */}
        {panel === "phones" && (
          <div className="mb-2 max-h-[40vh] shrink-0 overflow-y-auto rounded-surface border border-border-subtle bg-white p-4" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
            <p className="text-sm font-semibold text-text-primary mb-1">Números de WhatsApp (CallMeBot)</p>
            <p className="text-xs text-text-secondary mb-3">
              A estos números les llega el aviso de las piezas que tengan recordatorio activado (mismo día o N días antes).
              Cada número necesita su propia apikey de callmebot.com.
            </p>

            <div className="mb-4 rounded-control border border-border-subtle bg-surface-app p-3">
              <p className="text-xs font-semibold text-text-primary mb-1">Recordatorios automáticos</p>
              <p className="text-xs text-text-secondary mb-3">
                Configura cuándo y a qué hora sale el WhatsApp. Al guardar, se aplica a las piezas con recordatorio activado y queda como default de las nuevas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cuándo avisar</label>
                  <ReminderWhenSelect value={reminderDaysBefore} onChange={setReminderDaysBefore} />
                </div>
                <div>
                  <label className={labelClass}>Hora</label>
                  <select
                    className={inputClass}
                    value={reminderHour}
                    onChange={(e) => setReminderHour(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Minuto</label>
                  <select
                    className={inputClass}
                    value={reminderMinute}
                    onChange={(e) => setReminderMinute(Number(e.target.value))}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={saveReminderSchedule}
                disabled={scheduleBusy}
                className="min-h-10 px-4 py-2 text-sm rounded-control bg-action-primary text-action-primary-foreground font-semibold hover:bg-action-secondary transition-colors duration-200 disabled:opacity-50"
              >
                {scheduleBusy ? "Guardando…" : "Guardar avisos"}
              </button>
              {scheduleResult && (
                <p className={`text-xs mt-2 ${scheduleResult.startsWith("✓") ? "text-[#6E7F5C]" : "text-red-600"}`}>
                  {scheduleResult}
                </p>
              )}
            </div>

            {phones.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {phones.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-surface-app border border-border-subtle rounded-control px-3 py-2">
                    <span className="font-medium text-text-primary truncate">{p.label || "Sin nombre"}</span>
                    <span className="text-text-secondary text-xs">{p.phone}</span>
                    <button
                      type="button"
                      onClick={() => testPhone(p.id)}
                      disabled={testBusyId === p.id}
                      className="ml-auto px-2 py-1 text-xs rounded-md border border-border-subtle text-text-secondary hover:bg-white disabled:opacity-50"
                    >
                      {testBusyId === p.id ? "Enviando…" : "Enviar prueba"}
                    </button>
                    <button
                      onClick={() => removePhone(p.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {phoneTestResult && (
              <p className={`text-xs mb-3 ${phoneTestResult.startsWith("✓") ? "text-[#6E7F5C]" : "text-red-600"}`}>
                {phoneTestResult}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input className={inputClass} placeholder="Nombre (ej. Ángeles)" value={phoneForm.label} onChange={(e) => setPhoneForm((f) => ({ ...f, label: e.target.value }))} />
              <input className={inputClass} placeholder="+52 999 123 4567" value={phoneForm.phone} onChange={(e) => setPhoneForm((f) => ({ ...f, phone: e.target.value }))} />
              <input className={inputClass} placeholder="Apikey CallMeBot" value={phoneForm.apiKey} onChange={(e) => setPhoneForm((f) => ({ ...f, apiKey: e.target.value }))} />
              <button
                onClick={addPhone}
                disabled={phoneBusy || !phoneForm.phone.trim() || !phoneForm.apiKey.trim()}
                className="min-h-10 px-4 py-2 text-sm rounded-control bg-action-primary text-action-primary-foreground font-semibold hover:bg-action-secondary transition-colors duration-200 disabled:opacity-50 motion-reduce:transition-none"
              >
                Agregar
              </button>
            </div>
          </div>
        )}

        {/* Panel: IA */}
        {panel === "ai" && (
          <div className="mb-2 max-h-[40vh] shrink-0 overflow-y-auto rounded-surface border border-border-subtle bg-white p-4" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
            <p className="text-sm font-semibold text-text-primary mb-1">Calendario del mes con IA</p>
            {client.context ? (
              <p className="text-xs text-text-secondary mb-3">
                La IA conoce el contexto de {client.name} y generará el calendario de {monthLabel(cursor.year, cursor.month)} semana por semana.
              </p>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Este cliente aún no tiene contexto de marca. Edítalo desde la lista de clientes para que las ideas sean más precisas.
              </p>
            )}

            {/* Configuración: piezas por semana + semanas */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-3">
              <label className="flex items-center gap-2 text-xs text-text-primary">
                <span className="font-medium">Piezas por semana</span>
                <select
                  className="px-2 py-1.5 text-sm border border-border-subtle rounded-lg bg-white"
                  value={aiPerWeek}
                  onChange={(e) => setAiPerWeek(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-text-primary mr-1">Semanas</span>
                {[1, 2, 3, 4, 5].map((w) => {
                  const active = aiWeeks.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        setAiWeeks((prev) =>
                          active ? prev.filter((x) => x !== w) : [...prev, w].sort()
                        )
                      }
                      className={`w-8 h-8 text-xs rounded-lg border font-medium transition-colors ${
                        active
                          ? "border-action-primary bg-nav-active text-action-primary"
                          : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"
                      }`}
                      title={`Semana ${w} (días ${(w - 1) * 7 + 1}–${Math.min(w * 7, 31)})`}
                    >
                      S{w}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-text-secondary">
                = {aiPerWeek * aiWeeks.length} pieza(s) en total
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                className={`${inputClass} flex-1`}
                placeholder={`Instrucción opcional. Ej. videos miércoles y flyers viernes, tema: esperanza`}
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !aiBusy && aiWeeks.length > 0) generateIdeas(); }}
              />
              <button
                onClick={generateIdeas}
                disabled={aiBusy || aiWeeks.length === 0}
                className="min-h-10 px-4 py-2 text-sm rounded-control bg-action-primary text-action-primary-foreground font-semibold hover:bg-action-secondary transition-colors duration-200 disabled:opacity-60 whitespace-nowrap motion-reduce:transition-none"
              >
                {aiBusy ? "Generando semana por semana…" : "Generar calendario"}
              </button>
            </div>
            {aiBusy && (
              <p className="text-xs text-text-secondary mb-2">
                Generando {aiWeeks.length} semana(s) × {aiPerWeek} pieza(s)… puede tardar un momento.
              </p>
            )}
            {aiError && <p className="text-xs text-red-600 mb-2 whitespace-pre-line">{aiError}</p>}
            {aiWarning && <p className="text-xs text-amber-700 mb-2">{aiWarning}</p>}

            {aiIdeas.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-primary">{aiIdeas.length} ideas propuestas</p>
                  <button
                    onClick={addAllIdeas}
                    disabled={addAllBusy || aiIdeas.every((_, i) => addedIdeas.has(i))}
                    className="px-3 py-1.5 text-xs rounded-control bg-action-primary text-action-primary-foreground font-semibold hover:bg-action-secondary transition-colors duration-200 disabled:opacity-60 motion-reduce:transition-none"
                  >
                    {addAllBusy ? "Agregando…" : "Agregar todas al calendario"}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {aiIdeas.map((idea, idx) => (
                    <div key={idx} className="border border-border-subtle rounded-control p-3 bg-surface-app">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{idea.title}</p>
                          <p className="text-xs text-text-secondary">
                            {idea.week ? `S${idea.week} · ` : ""}{idea.date} · {TYPE_OPTIONS.find((t) => t.v === idea.type)?.label ?? idea.type}
                            {idea.time ? ` · ${idea.time}` : ""}
                          </p>
                          {idea.hook && <p className="text-xs text-text-primary mt-1 italic">&quot;{idea.hook}&quot;</p>}
                        </div>
                        <button
                          onClick={() => addIdea(idea, idx)}
                          disabled={addedIdeas.has(idx)}
                          className={`shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            addedIdeas.has(idx)
                              ? "bg-[#6E7F5C] text-white"
                              : "bg-action-primary text-action-primary-foreground hover:bg-action-secondary"
                          }`}
                        >
                          {addedIdeas.has(idx) ? "✓ En calendario" : "+ Agregar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="min-h-0 flex-1 rounded-surface bg-surface-sidebar animate-pulse" />
        ) : (
          <div className="min-h-0 flex-1">
            <ContentMonthGrid
              year={cursor.year}
              month={cursor.month}
              items={items.filter((item) => matchesPublishFilter(item.publishStatus, statusFilter))}
              editable
              fill
              onItemClick={(item) => { setSelected(item); setNotifyResult(null); }}
              onDayClick={(dateStr) => setNewForDate(dateStr)}
            />
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <ContentItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDelete={() => setDeleting(selected)}
          onSavePublishStatus={async (status) => {
            const res = await fetch(`/api/content/items/${selected.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publishStatus: status }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo guardar el estado");
            const next = {
              publishStatus: data.publishStatus ?? status,
              uploadedAt: data.uploadedAt ?? null,
            };
            setSelected((current) => (current && current.id === selected.id ? { ...current, ...next } : current));
            setItems((list) => list.map((it) => (it.id === selected.id ? { ...it, ...next } : it)));
          }}
          onSaveEditorNote={(note) => patchEditorNote(selected.id, { editorNote: note })}
          onUpdateEditorNote={(noteId, note) => patchEditorNote(selected.id, { updateEditorNoteId: noteId, editorNote: note })}
          onDeleteEditorNote={(noteId) => patchEditorNote(selected.id, { deleteEditorNoteId: noteId })}
          advanced={
            <div className="ncc-block">
              <h3>Recordatorio WhatsApp</h3>
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected.reminderEnabled}
                  onChange={(e) => patchItemReminder(selected, {
                    reminderEnabled: e.target.checked,
                    reminderDaysBefore: selected.reminderDaysBefore ?? reminderDaysBefore,
                  })}
                  className="rounded border-border-subtle"
                />
                <span className="font-medium">Recordatorio por WhatsApp</span>
              </label>
              <div className="mt-2">
                <label className={labelClass}>Cuándo avisar</label>
                <ReminderWhenSelect
                  value={selected.reminderDaysBefore ?? reminderDaysBefore}
                  onChange={(days) => patchItemReminder(selected, {
                    reminderEnabled: true,
                    reminderDaysBefore: days,
                  })}
                />
                <p className="text-xs text-text-secondary mt-2">
                  {selected.reminderEnabled
                    ? `Aviso automático: ${reminderDaysLabel(selected.reminderDaysBefore ?? reminderDaysBefore).toLowerCase()} a las ${String(reminderHour).padStart(2, "0")}:${String(reminderMinute).padStart(2, "0")}`
                    : "Actívalo o elige cuándo avisar para programar el WhatsApp."}
                </p>
              </div>
            </div>
          }
          actions={
            <>
              <button
                onClick={() => notifyItem(selected)}
                disabled={notifyBusy || phones.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#25D366] text-white font-medium hover:bg-[#1fb857] transition-colors disabled:opacity-50"
                title={phones.length === 0 ? "Agrega números en el panel WhatsApp" : "Enviar aviso con qué grabar y sugerencias"}
              >
                <HugeiconsIcon icon={SentIcon} size={14} color="white" />
                {notifyBusy ? "Enviando…" : "Avisar por WhatsApp"}
              </button>
              {notifyResult && (
                <p className={`w-full text-xs mt-1 ${notifyResult.startsWith("✓") ? "text-[#6E7F5C]" : "text-red-600"}`}>
                  {notifyResult}
                </p>
              )}
              {selected.notifiedAt && !notifyResult && (
                <p className="w-full text-xs mt-1 text-text-secondary">
                  Último aviso enviado: {new Date(selected.notifiedAt).toLocaleString("es-MX")}
                </p>
              )}
            </>
          }
        />
      )}

      {/* Modal editor */}
      {(editing || newForDate) && (
        <ContentItemEditor
          clientId={client.id}
          initial={editing}
          defaultDate={newForDate ?? ""}
          defaultDaysBefore={reminderDaysBefore}
          sendHour={reminderHour}
          sendMinute={reminderMinute}
          onClose={() => { setEditing(null); setNewForDate(null); }}
          onSaved={loadItems}
        />
      )}

      {/* Confirmación eliminar */}
      {deleting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" onClick={() => setDeleting(null)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative bg-white rounded-surface border border-border-subtle p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar &quot;{deleting.title}&quot;?</p>
            <p className="text-xs text-text-secondary mb-5">Se quitará del calendario, de Google Calendar si estaba sincronizada, y del enlace público.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">Cancelar</button>
              <button
                onClick={doDelete}
                disabled={deleteBusy}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                {deleteBusy ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
