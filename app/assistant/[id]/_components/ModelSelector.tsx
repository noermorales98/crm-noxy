"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Zap } from "lucide-react";
import { AI_MODELS, getModelGroups, getModelById, type AiModel } from "@/src/lib/ai-models";

const TAG_COLORS: Record<string, string> = {
  CRM: "bg-[#EBEDFA] text-[#3545D6]",
  Personalizado: "bg-[#EBEDFA] text-[#3545D6]",
  General: "bg-surface-sidebar text-text-secondary",
  Potente: "bg-amber-50 text-amber-600",
  Rápido: "bg-green-50 text-green-600",
  Código: "bg-nav-hover text-action-primary",
  Razonamiento: "bg-violet-50 text-violet-600",
  Visión: "bg-cyan-50 text-cyan-600",
  "Sin filtros": "bg-orange-50 text-orange-600",
};

interface Props {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  /** Where the dropdown opens relative to the trigger button */
  placement?: "bottom-left" | "top-right";
}

function buildGroups(builtins: AiModel[], customs: AiModel[]): { group: string; models: AiModel[] }[] {
  const all = [...builtins, ...customs];
  const result: { group: string; models: AiModel[] }[] = [];
  const idx = new Map<string, number>();
  for (const m of all) {
    const i = idx.get(m.group);
    if (i !== undefined) {
      result[i].models.push(m);
    } else {
      idx.set(m.group, result.length);
      result.push({ group: m.group, models: [m] });
    }
  }
  return result;
}

export default function ModelSelector({
  value,
  onChange,
  disabled,
  placement = "bottom-left",
}: Props) {
  const [open, setOpen] = useState(false);
  const [customModels, setCustomModels] = useState<AiModel[]>([]);
  const [hiddenBuiltins, setHiddenBuiltins] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const visibleBuiltins = AI_MODELS.filter((m) => !hiddenBuiltins.includes(m.id));
  const allModels = [...visibleBuiltins, ...customModels];
  const current = allModels.find((m) => m.id === value) ?? getModelById(value);
  const groups = buildGroups(visibleBuiltins, customModels);

  useEffect(() => {
    fetch("/api/settings/ai-models", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const mapped: AiModel[] = (data.models ?? [])
          .filter((m: any) => m.enabled)
          .map((m: any) => ({
            id: m.modelId,
            name: m.name,
            provider: "openrouter" as const,
            group: m.group || "Personalizados",
            description: m.description || "",
            tags: JSON.parse(m.tags || "[]"),
          }));
        setCustomModels(mapped);
        setHiddenBuiltins(Array.isArray(data.hiddenBuiltins) ? data.hiddenBuiltins : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const select = (model: AiModel) => {
    onChange(model.id);
    setOpen(false);
    try {
      localStorage.setItem("assistant-model", model.id);
    } catch {}
  };

  const isChatbase = current.provider === "chatbase";
  const isInline = placement === "top-right";

  const dropdownClass =
    placement === "top-right"
      ? "crm-floating-menu absolute bottom-full right-0 mb-2 w-72 bg-white rounded-xl border border-border-subtle overflow-hidden z-50"
      : "crm-floating-menu absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-border-subtle overflow-hidden z-50";

  const btnClass = isInline
    ? "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={btnClass}
        title="Cambiar modelo de IA"
      >
        {isChatbase ? (
          <span className="w-3 h-3 rounded-sm bg-[#3545D6] flex items-center justify-center shrink-0">
            <Zap size={7} className="text-white" />
          </span>
        ) : (
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        )}
        <span className={`truncate ${isInline ? "max-w-[100px]" : "max-w-[140px]"}`}>
          {current.name}
        </span>
        <ChevronDown
          size={10}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={dropdownClass}>
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border-subtle bg-surface-sidebar">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
              Seleccionar modelo de IA
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {allModels.length} modelos disponibles
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {groups.map(({ group, models }) => (
              <div key={group}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                  {group}
                </p>
                {models.map((model) => {
                  const isSelected = model.id === value;
                  const tag = model.tags?.[0];
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => select(model)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        isSelected ? "bg-[#EBEDFA]" : "hover:bg-surface-sidebar"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-medium truncate ${
                              isSelected ? "text-[#3545D6]" : "text-text-primary"
                            }`}
                          >
                            {model.name}
                          </span>
                          {tag && (
                            <span
                              className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                TAG_COLORS[tag] ?? "bg-surface-sidebar text-text-secondary"
                              }`}
                            >
                              {tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          {model.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check size={13} className="shrink-0 text-[#3545D6]" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-border-subtle bg-surface-sidebar">
            <p className="text-[10px] text-text-secondary">
              Los modelos de OpenRouter son gratuitos · Calidad puede variar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
