"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { APPEARANCE_COOKIE, DEFAULT_APPEARANCE, serializeAppearance, type Appearance } from "@/src/lib/appearance";

type AppearanceContextValue = { appearance: Appearance; setAppearance: (patch: Partial<Appearance>) => void };

const AppearanceContext = createContext<AppearanceContextValue>({ appearance: DEFAULT_APPEARANCE, setAppearance: () => {} });

/** Apariencia elegida (modo, radio, bordes). Cambia al instante y se guarda en una cookie para que el servidor pinte la próxima carga igual. */
export function AppearanceProvider({ initial, children }: { initial: Appearance; children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>(initial);
  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      try {
        document.cookie = `${APPEARANCE_COOKIE}=${serializeAppearance(next)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // La elección sigue valiendo en esta pantalla aunque el navegador no deje guardar cookies.
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
