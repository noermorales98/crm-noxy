"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import QuoteForm from "@/src/components/quotes/QuoteForm";

function NuevaCotizacionContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { setConfig, resetState } = useHeader();

  useEffect(() => {
    resetState();
    setConfig({ title: editId ? "Editar cotización" : "Nueva cotización" });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
      <QuoteForm mode={editId ? "edit" : "create"} quoteId={editId ?? undefined} />
    </main>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        </main>
      }
    >
      <NuevaCotizacionContent />
    </Suspense>
  );
}
