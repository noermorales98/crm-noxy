"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";

export type OrgRow = { id: string; name: string; role: string; current: boolean; brandColor: string | null; brandIcon: string | null };

/** Lista de mis organizaciones (se carga al abrir, no en cada pantalla), cambio de cuenta y alta de sub-cuenta. */
export function useOrgSwitch() {
  const { update } = useSession();
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrgs(data.organizations as OrgRow[]);
    } catch {
      setError("No se pudo cargar la lista de cuentas.");
    }
  }, []);

  const switchTo = useCallback(
    async (organizationId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/organizations/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo cambiar de cuenta");
        await update({ currentOrganizationId: organizationId });
        window.location.assign("/"); // recarga completa: ninguna pantalla se queda con datos (ni tema) de la cuenta anterior
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        setBusy(false);
      }
    },
    [update],
  );

  const create = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo crear la sub-cuenta");
        await switchTo(data.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        setBusy(false);
      }
    },
    [switchTo],
  );

  return { orgs, busy, error, load, switchTo, create };
}
