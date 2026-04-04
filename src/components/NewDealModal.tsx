"use client";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

const SOURCE_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERIDO", label: "Referido" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "VISITA", label: "Visita" },
  { value: "EMAIL_FRIO", label: "Email frío" },
  { value: "FORMULARIO", label: "Formulario" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "OTRO", label: "Otro" },
];

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm";

interface Stage { id: string; name: string; }
interface Pipeline { id: string; name: string; stages: Stage[]; }

interface Props {
  pipelines: Pipeline[];
  defaultStageId?: string;
  onSuccess: (deal: any) => void;
  onClose: () => void;
}

export default function NewDealModal({ pipelines, defaultStageId, onSuccess, onClose }: Props) {
  const allStages = pipelines.flatMap((p) => p.stages.map((s) => ({ ...s, pipelineName: p.name })));

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState(defaultStageId || allStages[0]?.id || "");
  const [source, setSource] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es requerido."); return; }
    if (!stageId) { setError("Selecciona un stage."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          value: value ? parseFloat(value) : 0,
          stageId,
          source: source || null,
          followUpAt: followUpAt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear el deal.");
        return;
      }
      const deal = await res.json();
      onSuccess(deal);
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nuevo deal</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Ej. Proyecto de branding para Acme"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Valor (USD)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputCls}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Stage</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                {allStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Fuente</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                <option value="">— Sin fuente —</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Follow-up</label>
              <input
                type="date"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl text-sm transition-colors disabled:opacity-50">
              {saving ? "Creando..." : "Crear deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
