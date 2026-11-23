"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import OrgMark from "./OrgMark";
import { useOrgSwitch } from "./useOrgSwitch";

/** Lista de cuentas para el menú «Más» del móvil: botones planos, sin selector nativo ni bordes extra. */
export default function OrgSwitchList() {
  const { orgs, busy, error, load, switchTo } = useOrgSwitch();
  useEffect(() => {
    void load();
  }, [load]);
  if (!orgs || orgs.length < 2) return error ? <p role="alert" className="px-2 pb-2 text-xs text-danger">{error}</p> : null;
  return (
    <div className="mb-2 flex flex-col gap-0.5">
      {orgs.map((org) => (
        <button
          key={org.id}
          type="button"
          disabled={busy}
          onClick={() => !org.current && void switchTo(org.id)}
          aria-current={org.current || undefined}
          className="flex min-h-11 items-center gap-2.5 rounded-control px-2 text-left text-sm text-text-primary outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
        >
          <OrgMark brandColor={org.brandColor} brandIcon={org.brandIcon} name={org.name} size={24} />
          <span className="min-w-0 flex-1 truncate">{org.name}</span>
          {org.current && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} aria-hidden="true" className="shrink-0 text-action-primary" />}
        </button>
      ))}
      {error && <p role="alert" className="px-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
