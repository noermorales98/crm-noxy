"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Org = { id: string; name: string; role: string; current: boolean };
const NEW = "__new__";

/** Selector de sub-cuenta: lista mis organizaciones, cambia la activa y crea una nueva. */
export default function OrganizationSwitcher() {
  const { data: session, update } = useSession();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentId = (session as { currentOrganizationId?: string | null } | null)?.currentOrganizationId ?? "";

  useEffect(() => {
    let alive = true;
    fetch("/api/organizations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setOrgs(d.organizations))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentId]);

  const switchTo = async (organizationId: string) => {
    const res = await fetch("/api/organizations/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo cambiar de cuenta");
    await update({ currentOrganizationId: organizationId });
    window.location.assign("/"); // recarga completa: ninguna pantalla debe quedarse con datos de la cuenta anterior
  };

  const onChange = async (value: string) => {
    if (busy || value === currentId) return;
    setBusy(true);
    setError(null);
    try {
      if (value === NEW) {
        const name = window.prompt("Nombre de la nueva sub-cuenta (cliente)");
        if (!name?.trim()) return;
        const res = await fetch("/api/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo crear la sub-cuenta");
        await switchTo(data.id);
      } else {
        await switchTo(value);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (!orgs.length) return null;
  return (
    <div className="px-2 pb-2">
      <label className="sr-only" htmlFor="org-switcher">Cuenta activa</label>
      <select
        id="org-switcher"
        value={currentId}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-control border border-border bg-surface px-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
        <option value={NEW}>+ Nueva sub-cuenta…</option>
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
