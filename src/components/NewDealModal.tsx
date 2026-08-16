"use client";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import DatePicker from "./DatePicker";
import { input as inputCls } from "@/src/lib/crm-ui";

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

interface Stage { id: string; name: string; }
interface Pipeline { id: string; name: string; stages: Stage[]; }
interface Props {
  pipelines: Pipeline[];
  defaultStageId?: string;
  onSuccess: (deal: any) => void;
  onClose: () => void;
}

export default function NewDealModal({ pipelines, defaultStageId, onSuccess, onClose }: Props) {
  const allStages = pipelines.flatMap((p) =>
    p.stages.map((s) => ({ ...s, pipelineName: p.name }))
  );

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [stageId, setStageId] = useState(defaultStageId || allStages[0]?.id || "");
  const [source, setSource] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es requerido."); return; }
    if (!stageId) { setError("Selecciona una etapa."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          value: value ? parseFloat(value) : 0,
          currency,
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
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Sin overflow-hidden en el contenedor del modal para que el DatePicker se vea */
    <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary">Nuevo deal</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-secondary hover:bg-nav-hover rounded-lg transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Ej. Proyecto de branding para Acme"
              autoFocus
            />
          </div>

          {/* Valor + moneda */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Valor</label>
            <div className="flex gap-2">
              {/* Selector de moneda */}
              <div className="flex rounded-lg border border-border-subtle bg-surface-sidebar overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${
                    currency === "USD"
                      ? "bg-action-primary text-white"
                      : "text-text-secondary hover:bg-nav-hover"
                  }`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("MXN")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${
                    currency === "MXN"
                      ? "bg-action-primary text-white"
                      : "text-text-secondary hover:bg-nav-hover"
                  }`}
                >
                  MXN
                </button>
              </div>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Etapa + Fuente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Etapa</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className={inputCls}
              >
                {allStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Fuente</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputCls}
              >
                <option value="">— Sin fuente —</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha de seguimiento */}
          <DatePicker
            label="Seguimiento"
            value={followUpAt}
            onChange={setFollowUpAt}
            placeholder="Sin fecha"
          />

          {/* Botones */}
          <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-white bg-action-primary hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
