"use client";

import { useEffect, useRef, useState } from "react";
import { WelcomeHeaderTitle } from "@/src/components/WelcomeHeaderTitle";
import { DashboardGrid } from "@/src/components/dashboard/DashboardGrid";
import { WidgetPicker } from "@/src/components/dashboard/WidgetPicker";
import { DashboardTabsTable } from "@/src/components/DashboardWidgets";
import type { DashboardData } from "@/src/lib/dashboardData";

interface DashboardCustomizerProps {
  initialWidgets: string[];
  initialTabs: string[];
  data: DashboardData;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function DashboardCustomizer({ initialWidgets, initialTabs, data }: DashboardCustomizerProps) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [tabs, setTabs] = useState(initialTabs);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const isFirstRender = useRef(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/dashboard-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgets, tabs }),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [widgets, tabs]);

  function handleAddWidget(id: string) {
    setWidgets((prev) => [...prev, id]);
  }
  function handleRemoveWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w !== id));
  }
  function handleAddTab(id: string) {
    setTabs((prev) => [...prev, id]);
  }
  function handleRemoveTab(id: string) {
    setTabs((prev) => prev.filter((t) => t !== id));
  }

  function handleToggleEditMode() {
    const next = !editMode;
    setEditMode(next);
    setPickerOpen(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <WelcomeHeaderTitle editMode={editMode} onToggleEditMode={handleToggleEditMode} />

      {editMode && (
        <div className="flex items-center justify-end -mb-2">
          <span className="text-xs text-text-secondary">
            {saveStatus === "saving" && "Guardando…"}
            {saveStatus === "saved" && "Guardado"}
            {saveStatus === "error" && "Error al guardar, intenta de nuevo"}
          </span>
        </div>
      )}

      <DashboardGrid
        widgetIds={widgets}
        data={data}
        editMode={editMode}
        onReorder={setWidgets}
        onRemove={handleRemoveWidget}
      />

      <DashboardTabsTable tabIds={tabs} data={data} editMode={editMode} onReorder={setTabs} onRemove={handleRemoveTab} />

      {editMode && pickerOpen && (
        <WidgetPicker
          activeWidgetIds={widgets}
          activeTabIds={tabs}
          onAddWidget={handleAddWidget}
          onAddTab={handleAddTab}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {editMode && !pickerOpen && (
        <button
          onClick={() => setPickerOpen(true)}
          className="fixed bottom-6 right-6 z-30 px-4 py-2.5 rounded-full bg-action-primary text-white text-xs font-medium shadow-lg hover:opacity-90"
        >
          + Agregar widgets o pestañas
        </button>
      )}
    </div>
  );
}
