"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, PencilEdit01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { useHeader } from "@/src/context/HeaderContext";
import { welcomeGreeting } from "@/src/lib/user-sexo";
import { Enter, PageHeader } from "@/src/components/ui";
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
  const { data: session } = useSession();
  const { setConfig, resetState } = useHeader();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `${welcomeGreeting(session?.user?.sexo)}, ${firstName}` : "Inicio";
  // La fecha se calcula en el cliente (zona horaria de la persona) para no desajustar la hidratación.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(format(new Date(), "EEEE d 'de' MMMM", { locale: es }));
  }, []);

  // La barra superior solo muestra el nombre en móvil: el h1 lo pone el PageHeader.
  useEffect(() => {
    resetState();
    setConfig({ pageHeader: true, title: "Inicio" });
    return () => setConfig({});
  }, [resetState, setConfig]);
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
      <Enter index={0}>
        <PageHeader
          title={greeting}
          subtitle={<span className="block min-h-[1.5em] first-letter:uppercase">{today}</span>}
          actions={
            <button
              type="button"
              onClick={handleToggleEditMode}
              aria-pressed={editMode}
              className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10"
            >
              <HugeiconsIcon icon={editMode ? CheckmarkCircle01Icon : PencilEdit01Icon} size={16} />
              {editMode ? "Listo" : "Personalizar"}
            </button>
          }
        />
      </Enter>
      {editMode && (
        <p role="status" aria-live="polite" className="-mt-3 text-right text-xs text-text-secondary">
          {saveStatus === "saving" && "Guardando…"}
          {saveStatus === "saved" && "Guardado"}
          {saveStatus === "error" && "Error al guardar, intenta de nuevo"}
        </p>
      )}
      <Enter index={1}>
        <DashboardGrid
          widgetIds={widgets}
          data={data}
          editMode={editMode}
          onReorder={setWidgets}
          onRemove={handleRemoveWidget}
        />
      </Enter>
      <Enter index={2}>
        <DashboardTabsTable tabIds={tabs} data={data} editMode={editMode} onReorder={setTabs} onRemove={handleRemoveTab} />
      </Enter>
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
          type="button"
          onClick={() => setPickerOpen(true)}
          className="crm-press fixed bottom-24 right-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground shadow-[0_8px_8px_rgba(11,11,24,0.10)] hover:bg-action-secondary lg:bottom-6 lg:right-6"
        >
          <HugeiconsIcon icon={Add01Icon} size={16} />
          Agregar widgets o pestañas
        </button>
      )}
    </div>
  );
}
