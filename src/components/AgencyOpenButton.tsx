"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

/** Cambia a la sub-cuenta y entra en su pipeline. Mismo flujo que el selector de la barra lateral. */
export default function AgencyOpenButton({ organizationId, current }: { organizationId: string; current: boolean }) {
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (current) {
      window.location.assign("/pipeline");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo cambiar de cuenta");
      await update({ currentOrganizationId: organizationId });
      window.location.assign("/pipeline"); // recarga completa: ninguna pantalla se queda con datos de la cuenta anterior
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-control border border-line px-3 text-sm font-medium text-text-primary hover:bg-nav-hover disabled:opacity-60 lg:min-h-9"
      >
        {busy ? "Abriendo…" : current ? "Ir al pipeline" : "Abrir"}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
