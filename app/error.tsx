"use client";

import { useEffect } from "react";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";
import { dbUnavailableUserMessage, isDbUnavailableError } from "@/src/lib/db-errors";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRM error boundary]", error);
  }, [error]);

  const dbDown = isDbUnavailableError(error);

  if (dbDown) {
    return (
      <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col bg-surface-app">
        <DbUnavailableNotice message={dbUnavailableUserMessage(error)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="max-w-md text-sm text-text-secondary">
            El shell del CRM sigue activo. Cuando el proveedor libere conexiones, pulsa reintentar.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-surface-app px-6 py-12 text-center">
      <p className="text-base font-semibold text-text-primary">Algo salió mal</p>
      <p className="max-w-md text-sm text-text-secondary">
        {error.message || "Error inesperado al cargar esta vista."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-10 items-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary"
      >
        Reintentar
      </button>
    </main>
  );
}
