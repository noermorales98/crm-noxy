"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_MOBILE_TAB_HREFS,
  MOBILE_TABS_STORAGE_KEY,
  customMobileTabs,
  mobilePickableHrefs,
  parseMobileTabs,
  toggleMobileTab,
} from "@/src/lib/crm-navigation";
import type { ModulePermissions, RoleName } from "@/src/lib/permissions";

const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return window.localStorage.getItem(MOBILE_TABS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function write(hrefs: readonly string[]) {
  try {
    window.localStorage.setItem(MOBILE_TABS_STORAGE_KEY, JSON.stringify(hrefs));
  } catch {
    // Sin almacenamiento la elección dura solo la sesión.
  }
  listeners.forEach((notify) => notify());
}

/** Barra inferior personalizable: Inicio y «Más» fijos, tres espacios a tu elección (guardados en este navegador). */
export function useMobileTabs() {
  const { data: session } = useSession();
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const raw = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      window.addEventListener("storage", notify);
      return () => {
        listeners.delete(notify);
        window.removeEventListener("storage", notify);
      };
    },
    readRaw,
    () => "",
  );
  const pickable = useMemo(() => mobilePickableHrefs(role, permissions), [role, permissions]);
  const selected = useMemo(() => parseMobileTabs(raw || null, pickable), [raw, pickable]);
  const tabs = useMemo(() => customMobileTabs(selected, role, permissions), [selected, role, permissions]);
  const toggle = useCallback((href: string) => write(toggleMobileTab(selected, href, pickable)), [selected, pickable]);
  const reset = useCallback(() => write(parseMobileTabs(null, pickable)), [pickable]);
  return { tabs, selected, pickable, toggle, reset, defaults: DEFAULT_MOBILE_TAB_HREFS };
}
