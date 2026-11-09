"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, PencilEdit01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { useHeader } from "@/src/context/HeaderContext";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import { greetingFor, summarizeWork } from "@/src/lib/dashboard-greeting";
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
  const name = session?.user?.name ?? "";
  const sexo = session?.user?.sexo ?? null;
  // El saludo depende de la hora de la persona: se calcula tras montar para no desajustar la hidratación.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const greeting = now
    ? greetingFor({
        now,
        name,
        sexo,
        ...summarizeWork({
          now,
          tasks: (data.pendingTasks ?? []).map((task) => ({ dueDate: task.dueDate, isCompleted: task.isCompleted })),
          appointments: (data.upcomingAppointments ?? []).map((appointment) => ({
            startTime: appointment.startTime,
            title: appointment.appointmentType.name,
          })),
        }),
      })
    : null;

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
    <div className="flex flex-col gap-3 lg:gap-5">
      <Enter index={0}>
        <PageHeader
          title={greeting?.headline ?? "Inicio"}
          denseOnMobile
          leading={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarSrc(sexo)}
              alt=""
              width={56}
              height={56}
              className="size-12 shrink-0 rounded-full border border-line bg-surface-elevated object-cover sm:size-14"
            />
          }
          subtitle={
            <span className="block min-h-[2.75em]">
              <span className="block text-xs font-medium text-text-secondary">{greeting?.kicker ?? ""}</span>
              <span className="block text-sm text-text-primary">{greeting?.status ?? ""}</span>
            </span>
          }
          actions={
            <button
              type="button"
              onClick={handleToggleEditMode}
              aria-pressed={editMode}
              className="crm-press hidden min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:inline-flex lg:min-h-10"
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
