"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import QuoteForm from "@/src/components/quotes/QuoteForm";
import { PageHeader, Skeleton } from "@/src/components/ui";

function NuevaCotizacionContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { setConfig, resetState } = useHeader();

  useEffect(() => {
    resetState();
    setConfig({ title: editId ? "Editar cotización" : "Nueva cotización", backHref: "/cotizaciones", pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <PageHeader
        title={editId ? "Editar cotización" : "Nueva cotización"}
        subtitle={editId ? "Cambia los conceptos o las condiciones y guarda." : "Elige el cliente, agrega conceptos y guarda o envía."}
      />
      <QuoteForm mode={editId ? "edit" : "create"} quoteId={editId ?? undefined} />
    </main>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense
      fallback={
        <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <Skeleton shape="rows" count={4} label="Cargando cotización" />
          </div>
        </main>
      }
    >
      <NuevaCotizacionContent />
    </Suspense>
  );
}
