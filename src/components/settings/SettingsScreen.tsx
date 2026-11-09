"use client";

import { useEffect, type ReactNode } from "react";
import { useHeader } from "@/src/context/HeaderContext";

/** Marco común de cada apartado de Ajustes (ancho, margen y encabezado superior); cada página pinta su PageHeader. */
export function SettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const { setConfig, resetState } = useHeader();
  useEffect(() => {
    resetState();
    setConfig({ title, pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-3xl">
        {children}
      </div>
    </main>
  );
}

export function SaveBar({ saving, saved, error, label = "Guardar cambios" }: { saving: boolean; saved: boolean; error: string | null; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 sm:px-5">
      <button
        type="submit"
        disabled={saving}
        className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10"
      >
        {saving ? "Guardando…" : label}
      </button>
      <p role="status" aria-live="polite" className={`text-sm ${error ? "text-danger" : "text-success"}`}>
        {error ?? (saved ? "Guardado." : "")}
      </p>
    </div>
  );
}
