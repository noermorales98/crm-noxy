"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { WIDGET_REGISTRY, type WidgetDefinition } from "@/src/lib/dashboardWidgets";
import { TAB_REGISTRY } from "@/src/lib/dashboardTabs";

interface WidgetPickerProps {
  activeWidgetIds: string[];
  activeTabIds: string[];
  onAddWidget: (id: string) => void;
  onAddTab: (id: string) => void;
  onClose: () => void;
}

function groupByCategory(items: WidgetDefinition[]) {
  const groups: Record<string, WidgetDefinition[]> = {};
  for (const item of items) {
    groups[item.category] = groups[item.category] ?? [];
    groups[item.category].push(item);
  }
  return groups;
}

export function WidgetPicker({ activeWidgetIds, activeTabIds, onAddWidget, onAddTab, onClose }: WidgetPickerProps) {
  const availableWidgets = WIDGET_REGISTRY.filter((w) => !activeWidgetIds.includes(w.id));
  const availableTabs = TAB_REGISTRY.filter((t) => !activeTabIds.includes(t.id));
  const widgetGroups = groupByCategory(availableWidgets);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-brand-obsidian/10" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-surface-elevated border-l border-line overflow-y-auto shadow-[0_8px_8px_rgba(11,11,24,0.10)] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface-elevated z-10">
          <p className="text-sm font-semibold text-text-primary">Agregar al dashboard</p>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold text-text-secondary">Pestañas de la tabla</p>
            {availableTabs.length === 0 ? (
              <p className="text-xs text-text-secondary">Ya agregaste todas las pestañas disponibles.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {availableTabs.map((t) => (
                  <PickerRow key={t.id} icon={t.icon} label={t.label} onAdd={() => onAddTab(t.id)} />
                ))}
              </div>
            )}
          </div>

          {Object.entries(widgetGroups).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold text-text-secondary">{category}</p>
              <div className="flex flex-col gap-1.5">
                {items.map((w) => (
                  <PickerRow key={w.id} icon={w.icon} label={w.label} onAdd={() => onAddWidget(w.id)} />
                ))}
              </div>
            </div>
          ))}

          {availableWidgets.length === 0 && (
            <p className="text-xs text-text-secondary">Ya agregaste todos los widgets disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PickerRow({ icon, label, onAdd }: { icon: any; label: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line hover:bg-nav-hover transition-colors text-left"
    >
      <HugeiconsIcon icon={icon} size={16} />
      <span className="flex-1 text-sm text-text-primary">{label}</span>
      <HugeiconsIcon icon={Add01Icon} size={16} className="text-text-secondary" />
    </button>
  );
}
