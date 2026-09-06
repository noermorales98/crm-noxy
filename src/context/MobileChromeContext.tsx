"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type OpenSidebarHandler = () => void;

interface MobileChromeContextValue {
  openMobileSidebar: () => void;
  registerOpenMobileSidebar: (handler: OpenSidebarHandler | null) => void;
}

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);

export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const openHandlerRef = useRef<OpenSidebarHandler | null>(null);

  const registerOpenMobileSidebar = useCallback((handler: OpenSidebarHandler | null) => {
    openHandlerRef.current = handler;
  }, []);

  const openMobileSidebar = useCallback(() => {
    openHandlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ openMobileSidebar, registerOpenMobileSidebar }),
    [openMobileSidebar, registerOpenMobileSidebar],
  );

  return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
}

export function useMobileChrome() {
  const ctx = useContext(MobileChromeContext);
  if (!ctx) throw new Error("useMobileChrome must be used within MobileChromeProvider");
  return ctx;
}

export function useOptionalMobileChrome() {
  return useContext(MobileChromeContext);
}
