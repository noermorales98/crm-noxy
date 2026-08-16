"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  CRM_THEMES,
  isCrmThemeId,
  resolveCrmTheme,
  type CrmThemeDefinition,
  type CrmThemeId,
} from "@/src/lib/crm-themes";
import {
  applyConfirmedTheme,
  beginThemeSelection,
  confirmThemeSelection,
  createThemePreferenceState,
  rollbackThemeSelection,
  themeStorageKey,
  type CrmThemePreferenceState,
  type CrmThemeSaveStatus,
} from "@/src/lib/crm-theme-preference";

type CrmThemeContextValue = {
  themeId: CrmThemeId;
  theme: CrmThemeDefinition;
  themes: readonly CrmThemeDefinition[];
  saveStatus: CrmThemeSaveStatus;
  message: string;
  selectTheme: (themeId: CrmThemeId) => void;
};

const CrmThemeContext = createContext<CrmThemeContextValue | null>(null);

function readCachedTheme(userId: string): CrmThemeId | undefined {
  try {
    const cached = window.localStorage.getItem(themeStorageKey(userId));
    return isCrmThemeId(cached) ? cached : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedTheme(userId: string, themeId: CrmThemeId) {
  try {
    window.localStorage.setItem(themeStorageKey(userId), themeId);
  } catch {
    // The server remains the source of truth when storage is unavailable.
  }
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function CrmThemeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return (
    <CrmThemePreferenceProvider key={userId ?? "anonymous"} userId={userId}>
      {children}
    </CrmThemePreferenceProvider>
  );
}

function CrmThemePreferenceProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [state, setState] = useState<CrmThemePreferenceState>(() => {
    const initial = createThemePreferenceState(userId ? readCachedTheme(userId) : undefined);
    return userId ? { ...initial, saveStatus: "loading" } : initial;
  });
  const requestVersionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadVersion = ++requestVersionRef.current;
    const controller = new AbortController();
    saveControllerRef.current = controller;

    void fetch("/api/settings/theme", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el tema.");
        const payload = (await response.json()) as { theme?: unknown };
        if (requestVersionRef.current !== loadVersion) return;
        const serverTheme = resolveCrmTheme(payload.theme).id;
        setState((current) => applyConfirmedTheme(current, serverTheme));
        writeCachedTheme(userId, serverTheme);
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestVersionRef.current !== loadVersion) return;
        setState((current) => ({ ...current, saveStatus: "idle", message: "" }));
      });

    return () => controller.abort();
  }, [userId]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveControllerRef.current?.abort();
  }, []);

  const selectTheme = useCallback((themeId: CrmThemeId) => {
    if (!userId) return;

    const requestVersion = ++requestVersionRef.current;
    setState((current) => beginThemeSelection(current, themeId, requestVersion));
    writeCachedTheme(userId, themeId);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveControllerRef.current?.abort();

    saveTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      saveControllerRef.current = controller;

      void fetch("/api/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("No se pudo guardar el tema.");
          setState((current) => {
            const next = confirmThemeSelection(current, requestVersion);
            if (next !== current) writeCachedTheme(userId, next.confirmedThemeId);
            return next;
          });
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          setState((current) => {
            const next = rollbackThemeSelection(current, requestVersion);
            if (next !== current) writeCachedTheme(userId, next.activeThemeId);
            return next;
          });
        });
    }, 220);
  }, [userId]);

  const value = useMemo<CrmThemeContextValue>(() => ({
    themeId: state.activeThemeId,
    theme: resolveCrmTheme(state.activeThemeId),
    themes: CRM_THEMES,
    saveStatus: state.saveStatus,
    message: state.message,
    selectTheme,
  }), [selectTheme, state.activeThemeId, state.message, state.saveStatus]);

  return <CrmThemeContext.Provider value={value}>{children}</CrmThemeContext.Provider>;
}

export function useCrmTheme(): CrmThemeContextValue {
  const context = useContext(CrmThemeContext);
  if (!context) throw new Error("useCrmTheme must be used inside CrmThemeProvider");
  return context;
}
