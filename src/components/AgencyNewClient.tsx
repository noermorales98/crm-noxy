"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

const primary =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";

/** Alta de un cliente (sub-cuenta) desde el panel: te hace OWNER, la deja con su pipeline y plantillas, y refresca la lista. */
export default function AgencyNewClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear el cliente");
      setName("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
        Nuevo cliente
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="new-client-name" className="sr-only">Nombre del cliente</label>
      <input
        id="new-client-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setError(null); } }}
        placeholder="Nombre del cliente"
        maxLength={120}
        className="min-h-11 w-64 max-w-full rounded-control border border-line bg-surface-elevated px-3 text-sm text-text-primary outline-none placeholder:text-text-placeholder focus-visible:ring-2 focus-visible:ring-focus lg:min-h-10"
      />
      <button type="submit" disabled={busy || !name.trim()} className={primary}>{busy ? "Creando…" : "Crear cliente"}</button>
      <button type="button" onClick={() => { setOpen(false); setError(null); }} className="min-h-11 rounded-control px-3 text-sm font-medium text-text-secondary-strong hover:bg-nav-hover lg:min-h-10">Cancelar</button>
      {error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
