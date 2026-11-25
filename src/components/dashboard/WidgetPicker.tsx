"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { WIDGET_REGISTRY, type WidgetDefinition } from "@/src/lib/dashboardWidgets";
import { TAB_REGISTRY } from "@/src/lib/dashboardTabs";
import type { DashboardData, DataKey } from "@/src/lib/dashboardData";

interface WidgetPickerProps {
  activeWidgetIds: string[];
  activeTabIds: string[];
  /** Datos que el tablero ya tiene; lo que falte se pide al previsualizar. */
  data: DashboardData;
  onAddWidget: (id: string) => void;
  onAddTab: (id: string) => void;
  /** Avisa al tablero de datos recién pedidos para que el widget agregado ya salga con información. */
  onData: (partial: DashboardData) => void;
  onClose: () => void;
}

const SIZE_LABEL = { sm: "Pequeño", md: "Mediano", lg: "Grande" } as const;

function groupByCategory(items: WidgetDefinition[]) {
  const groups: Record<string, WidgetDefinition[]> = {};
  for (const item of items) {
    groups[item.category] = groups[item.category] ?? [];
    groups[item.category].push(item);
  }
  return groups;
}

export function WidgetPicker({ activeWidgetIds, activeTabIds, data, onAddWidget, onAddTab, onData, onClose }: WidgetPickerProps) {
  const [extra, setExtra] = useState<DashboardData>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");
  const requestId = useRef(0);

  const merged: DashboardData = { ...data, ...extra };
  const hasData = (def: WidgetDefinition, source: DashboardData) => def.dataKeys.every((key) => source[key] !== undefined);

  /** Trae los datos que le faltan al widget; devuelve false si no se pudieron cargar. */
  async function ensureData(def: WidgetDefinition): Promise<boolean> {
    const missing = def.dataKeys.filter((key: DataKey) => merged[key] === undefined);
    if (missing.length === 0) return true;
    try {
      const res = await fetch(`/api/dashboard-data?keys=${missing.join(",")}`, { cache: "no-store" });
      if (!res.ok) return false;
      const loaded = (await res.json()) as DashboardData;
      setExtra((prev) => ({ ...prev, ...loaded }));
      onData(loaded);
      return true;
    } catch {
      return false;
    }
  }

  async function togglePreview(def: WidgetDefinition) {
    if (selected === def.id) {
      setSelected(null);
      return;
    }
    setSelected(def.id);
    const id = ++requestId.current;
    if (hasData(def, merged)) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const ok = await ensureData(def);
    if (id === requestId.current) setStatus(ok ? "idle" : "error");
  }

  async function addWidget(def: WidgetDefinition) {
    setStatus("loading");
    const ok = await ensureData(def);
    if (!ok) {
      setStatus("error");
      return;
    }
    setStatus("idle");
    setSelected(null);
    onAddWidget(def.id);
  }

  const needle = query.trim().toLowerCase();
  const availableTabs = TAB_REGISTRY.filter((t) => !activeTabIds.includes(t.id) && (!needle || t.label.toLowerCase().includes(needle)));
  const availableWidgets = WIDGET_REGISTRY.filter(
    (w) => !activeWidgetIds.includes(w.id) && (!needle || `${w.label} ${w.category}`.toLowerCase().includes(needle)),
  );
  const widgetGroups = groupByCategory(availableWidgets);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-brand-obsidian/10" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
        <div className="sticky top-0 z-10 border-b border-line bg-surface-elevated px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Agregar al dashboard</p>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Cerrar">
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Toca un widget para ver cómo se vería con tus datos; el «+» lo agrega directo.</p>
          <label className="mt-3 flex h-10 items-center gap-2 rounded-control border border-line bg-surface-app px-3 text-text-secondary focus-within:ring-2 focus-within:ring-focus">
            <HugeiconsIcon icon={Search01Icon} size={16} />
            <span className="sr-only">Buscar widget</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: ventas, cotizaciones, citas…"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            />
          </label>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {availableTabs.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-text-secondary">Pestañas de la tabla</p>
              <div className="flex flex-col gap-1.5">
                {availableTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onAddTab(t.id)}
                    className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-nav-hover"
                  >
                    <HugeiconsIcon icon={t.icon} size={16} />
                    <span className="flex-1 text-sm text-text-primary">{t.label}</span>
                    <HugeiconsIcon icon={Add01Icon} size={16} className="text-text-secondary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {Object.entries(widgetGroups).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold text-text-secondary">{category}</p>
              <div className="flex flex-col gap-1.5">
                {items.map((w) => {
                  const open = selected === w.id;
                  return (
                    <div key={w.id} className="overflow-hidden rounded-lg border border-line">
                      <div className="flex items-center">
                        <button
                          onClick={() => togglePreview(w)}
                          aria-expanded={open}
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-nav-hover"
                        >
                          <HugeiconsIcon icon={w.icon} size={16} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-text-primary">{w.label}</span>
                            <span className="block text-xs text-text-secondary">{SIZE_LABEL[w.size]}</span>
                          </span>
                          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className={`text-text-secondary ${open ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          onClick={() => addWidget(w)}
                          aria-label={`Agregar ${w.label}`}
                          className="flex size-11 shrink-0 items-center justify-center border-l border-line text-text-secondary hover:bg-nav-hover hover:text-text-primary"
                        >
                          <HugeiconsIcon icon={Add01Icon} size={16} />
                        </button>
                      </div>
                      {open && (
                        <div className="border-t border-line bg-surface-app p-3">
                          {status === "loading" && !hasData(w, merged) ? (
                            <p role="status" className="py-6 text-center text-sm text-text-secondary">Cargando vista previa…</p>
                          ) : status === "error" && !hasData(w, merged) ? (
                            <p role="alert" className="py-6 text-center text-sm text-danger">No se pudo cargar la vista previa. Intenta de nuevo.</p>
                          ) : (
                            <div aria-label={`Vista previa de ${w.label}`} className="pointer-events-none select-none">
                              {w.render(merged)}
                            </div>
                          )}
                          <button
                            onClick={() => addWidget(w)}
                            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary"
                          >
                            <HugeiconsIcon icon={Add01Icon} size={16} />
                            Agregar al inicio
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {availableWidgets.length === 0 && availableTabs.length === 0 && (
            <p className="text-xs text-text-secondary">
              {needle ? "Ningún widget coincide con tu búsqueda." : "Ya agregaste todos los widgets disponibles."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
