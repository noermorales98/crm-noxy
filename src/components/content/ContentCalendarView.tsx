"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, AiChatIcon, ArrowLeft01Icon, ArrowRight01Icon,
  Share01Icon, Delete01Icon, PencilEdit01Icon, SentIcon, Copy01Icon,
  CheckmarkCircle01Icon, RefreshIcon,
} from "@hugeicons/core-free-icons";
import {
  CALENDAR_CSS, CALENDAR_FONTS, ContentMonthGrid, ContentItemModal,
  monthLabel, type ContentItemData,
} from "./ContentCalendar";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PhoneEntry = { id: string; label: string | null; phone: string; apiKey: string };

type ClientData = {
  id: string; name: string; kind: string; description: string | null;
  context: string | null; publicToken: string; phones: PhoneEntry[];
};

type AiIdea = {
  date: string; type: string; title: string; time: string | null;
  hook: string | null; script: string | null; caption: string | null;
  cta: string | null; tips: string | null;
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
  "w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#B75C3E]/30 focus:border-[#B75C3E]";
const labelClass = "block text-xs font-medium text-text-secondary mb-1";

// ─── Modal editor de pieza ────────────────────────────────────────────────────

function ItemEditor({
  clientId,
  initial,
  defaultDate,
  onClose,
  onSaved,
}: {
  clientId: string;
  initial: ContentItemData | null;
  defaultDate: string;
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
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {initial ? "Editar pieza" : "Nueva pieza de contenido"}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Fecha *</label>
            <input type="date" className={inputClass} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPE_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Título *</label>
          <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Volver a creer en el amor" />
        </div>

        <div className="mb-3">
          <label className={labelClass}>Hora recomendada</label>
          <input className={inputClass} value={form.time} onChange={(e) => set("time", e.target.value)} placeholder="Ej. 11:00 am" />
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

        <div className="mb-3">
          <label className={labelClass}>Texto para publicar / frase</label>
          <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.caption} onChange={(e) => set("caption", e.target.value)} />
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

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 text-sm rounded-lg bg-[#B75C3E] text-white font-medium hover:bg-[#a04e33] transition-colors disabled:opacity-60"
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
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [items, setItems] = useState<ContentItemData[]>([]);
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
  const publicUrl = `${origin}/calendario/${client.publicToken}`;

  // WhatsApp
  const [phones, setPhones] = useState<PhoneEntry[]>(client.phones ?? []);
  const [phoneForm, setPhoneForm] = useState({ label: "", phone: "", apiKey: "" });
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  // IA
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiIdeas, setAiIdeas] = useState<AiIdea[]>([]);
  const [addedIdeas, setAddedIdeas] = useState<Set<number>>(new Set());

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

  const moveMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
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
      setNotifyResult(`✓ Aviso enviado a ${data.sent} número(s)${data.failed ? ` · ${data.failed} fallaron` : ""}`);
    } catch (e: any) {
      setNotifyResult(`✕ ${e.message}`);
    } finally {
      setNotifyBusy(false);
    }
  };

  const generateIdeas = async () => {
    setAiBusy(true); setAiError(""); setAddedIdeas(new Set());
    try {
      const res = await fetch(`/api/content/clients/${client.id}/ai-ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction, month: monthParam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de IA");
      setAiIdeas(data.ideas ?? []);
      if ((data.ideas ?? []).length === 0) setAiError("La IA no propuso ideas. Prueba con otra instrucción.");
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const addIdea = async (idea: AiIdea, idx: number) => {
    const res = await fetch(`/api/content/clients/${client.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...idea, hooksAlt: [] }),
    });
    if (res.ok) {
      setAddedIdeas((s) => new Set(s).add(idx));
      loadItems();
    }
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
      onClick={() => setPanel((p) => (p === id ? null : id))}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
        panel === id
          ? "border-[#B75C3E] bg-[#F9E8E1] text-[#B75C3E] font-medium"
          : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"
      }`}
    >
      <HugeiconsIcon icon={icon} size={14} color={panel === id ? "#B75C3E" : "#37352F"} />
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-[#FBF7F1]">
      {CALENDAR_FONTS}
      <style>{CALENDAR_CSS}</style>

      <div className="ncc-root max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {/* Encabezado */}
        <div className="mb-5" style={{ fontFamily: '"Work Sans",sans-serif' }}>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.14em] font-semibold text-[#B75C3E]">
            {client.kind === "cliente" ? "Cliente" : "Marca propia"}
            {client.description ? ` · ${client.description}` : ""}
          </p>
          <h1
            className="text-[#2B2140] leading-tight mt-1"
            style={{ fontFamily: '"Fraunces",serif', fontWeight: 500, fontSize: "clamp(26px,5vw,38px)" }}
          >
            {client.name}
          </h1>
        </div>

        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-2 mb-4" style={{ fontFamily: '"Work Sans",sans-serif' }}>
          <button
            onClick={() => setNewForDate(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#B75C3E] text-white font-medium hover:bg-[#a04e33] transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} color="white" />
            Agregar pieza
          </button>
          {panelBtn("share", Share01Icon, "Compartir")}
          {panelBtn("phones", SentIcon, `WhatsApp (${phones.length})`)}
          {panelBtn("ai", AiChatIcon, "Ideas con IA")}
        </div>

        {/* Panel: compartir */}
        {panel === "share" && (
          <div className="mb-5 bg-white border border-[#E4DCD0] rounded-xl p-4" style={{ fontFamily: '"Work Sans",sans-serif' }}>
            <p className="text-sm font-semibold text-[#2B2140] mb-1">Enlace público del calendario</p>
            <p className="text-xs text-[#8A7F8F] mb-3">
              Mándale este enlace al cliente: verá el calendario (sin poder editarlo) con qué debe grabar y las sugerencias.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={publicUrl} className={`${inputClass} flex-1 text-xs`} onFocus={(e) => e.target.select()} />
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#2D2D2D] text-white font-medium hover:bg-[#1a1a1a] transition-colors"
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
          <div className="mb-5 bg-white border border-[#E4DCD0] rounded-xl p-4" style={{ fontFamily: '"Work Sans",sans-serif' }}>
            <p className="text-sm font-semibold text-[#2B2140] mb-1">Números de WhatsApp (CallMeBot)</p>
            <p className="text-xs text-[#8A7F8F] mb-3">
              A estos números les llega el aviso de qué contenido grabar y cuándo. Cada número necesita su propia apikey de
              callmebot.com (se obtiene escribiendo &quot;I allow callmebot to send me messages&quot; al bot).
            </p>
            {phones.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {phones.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-[#FBF7F1] border border-[#E4DCD0] rounded-lg px-3 py-2">
                    <span className="font-medium text-[#2B2140] truncate">{p.label || "Sin nombre"}</span>
                    <span className="text-[#8A7F8F] text-xs">{p.phone}</span>
                    <button
                      onClick={() => removePhone(p.id)}
                      className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-[#8A7F8F] hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <input className={inputClass} placeholder="Nombre (ej. Ángeles)" value={phoneForm.label} onChange={(e) => setPhoneForm((f) => ({ ...f, label: e.target.value }))} />
              <input className={inputClass} placeholder="+52 999 123 4567" value={phoneForm.phone} onChange={(e) => setPhoneForm((f) => ({ ...f, phone: e.target.value }))} />
              <input className={inputClass} placeholder="Apikey CallMeBot" value={phoneForm.apiKey} onChange={(e) => setPhoneForm((f) => ({ ...f, apiKey: e.target.value }))} />
              <button
                onClick={addPhone}
                disabled={phoneBusy || !phoneForm.phone.trim() || !phoneForm.apiKey.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-[#2D2D2D] text-white font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        )}

        {/* Panel: IA */}
        {panel === "ai" && (
          <div className="mb-5 bg-white border border-[#E4DCD0] rounded-xl p-4" style={{ fontFamily: '"Work Sans",sans-serif' }}>
            <p className="text-sm font-semibold text-[#2B2140] mb-1">Ideas de contenido con IA</p>
            {client.context ? (
              <p className="text-xs text-[#8A7F8F] mb-3">
                La IA conoce el contexto de {client.name}. Pídele ideas sueltas o un calendario para {monthLabel(cursor.year, cursor.month)}.
              </p>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Este cliente aún no tiene contexto de marca. Edítalo desde la lista de clientes para que las ideas sean más precisas.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                className={`${inputClass} flex-1`}
                placeholder={`Ej. Dame un video semanal y un flyer para ${monthLabel(cursor.year, cursor.month)}, tema: esperanza`}
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !aiBusy) generateIdeas(); }}
              />
              <button
                onClick={generateIdeas}
                disabled={aiBusy}
                className="px-4 py-2 text-sm rounded-lg bg-[#B75C3E] text-white font-medium hover:bg-[#a04e33] transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {aiBusy ? "Generando…" : "Generar ideas"}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-600 mb-2">{aiError}</p>}
            {aiIdeas.length > 0 && (
              <div className="flex flex-col gap-2">
                {aiIdeas.map((idea, idx) => (
                  <div key={idx} className="border border-[#E4DCD0] rounded-lg p-3 bg-[#FBF7F1]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2B2140]">{idea.title}</p>
                        <p className="text-xs text-[#8A7F8F]">
                          {idea.date} · {TYPE_OPTIONS.find((t) => t.v === idea.type)?.label ?? idea.type}
                          {idea.time ? ` · ${idea.time}` : ""}
                        </p>
                        {idea.hook && <p className="text-xs text-[#2B2140] mt-1 italic">&quot;{idea.hook}&quot;</p>}
                      </div>
                      <button
                        onClick={() => addIdea(idea, idx)}
                        disabled={addedIdeas.has(idx)}
                        className={`shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          addedIdeas.has(idx)
                            ? "bg-[#6E7F5C] text-white"
                            : "bg-[#2D2D2D] text-white hover:bg-[#1a1a1a]"
                        }`}
                      >
                        {addedIdeas.has(idx) ? "✓ En calendario" : "+ Agregar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navegación de mes */}
        <div className="flex items-center justify-between mb-3" style={{ fontFamily: '"Work Sans",sans-serif' }}>
          <button
            onClick={() => moveMonth(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E4DCD0] bg-white text-[#2B2140] hover:bg-[#F3ECE0] transition-colors"
            aria-label="Mes anterior"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>
          <h2
            className="text-[#2B2140] capitalize"
            style={{ fontFamily: '"Fraunces",serif', fontWeight: 500, fontSize: "clamp(20px,4vw,28px)" }}
          >
            {monthLabel(cursor.year, cursor.month)}
          </h2>
          <button
            onClick={() => moveMonth(1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E4DCD0] bg-white text-[#2B2140] hover:bg-[#F3ECE0] transition-colors"
            aria-label="Mes siguiente"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
        </div>

        {/* Calendario */}
        {loading ? (
          <div className="h-96 rounded-xl bg-[#F3ECE0] animate-pulse" />
        ) : (
          <ContentMonthGrid
            year={cursor.year}
            month={cursor.month}
            items={items}
            editable
            onItemClick={(item) => { setSelected(item); setNotifyResult(null); }}
            onDayClick={(dateStr) => setNewForDate(dateStr)}
          />
        )}

        {/* Leyenda */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-5 text-xs text-[#2B2140]" style={{ fontFamily: '"Work Sans",sans-serif' }}>
          {TYPE_OPTIONS.filter((t) => t.v !== "edicion").map((t) => (
            <span key={t.v} className="inline-flex items-center gap-2">
              <i
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: { video: "#B75C3E", reel: "#9B7EDE", flyer: "#6E7F5C", historia: "#4A7BA6", entrega: "#C9973B" }[t.v] }}
              />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Modal detalle */}
      {selected && (
        <ContentItemModal
          item={selected}
          onClose={() => setSelected(null)}
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
              <button
                onClick={() => { setEditing(selected); setSelected(null); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#2D2D2D] text-white font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={14} color="white" />
                Editar
              </button>
              <button
                onClick={() => setDeleting(selected)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <HugeiconsIcon icon={Delete01Icon} size={14} color="#dc2626" />
              </button>
              {notifyResult && (
                <p className={`w-full text-xs mt-1 ${notifyResult.startsWith("✓") ? "text-[#6E7F5C]" : "text-red-600"}`}>
                  {notifyResult}
                </p>
              )}
              {selected.notifiedAt && !notifyResult && (
                <p className="w-full text-xs mt-1 text-[#8A7F8F]">
                  Último aviso enviado: {new Date(selected.notifiedAt).toLocaleString("es-MX")}
                </p>
              )}
            </>
          }
        />
      )}

      {/* Modal editor */}
      {(editing || newForDate) && (
        <ItemEditor
          clientId={client.id}
          initial={editing}
          defaultDate={newForDate ?? ""}
          onClose={() => { setEditing(null); setNewForDate(null); }}
          onSaved={loadItems}
        />
      )}

      {/* Confirmación eliminar */}
      {deleting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" onClick={() => setDeleting(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar &quot;{deleting.title}&quot;?</p>
            <p className="text-xs text-text-secondary mb-5">Se quitará del calendario y del enlace público.</p>
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
