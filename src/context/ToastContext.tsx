"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { sileo, Toaster } from "sileo";
import { play } from "cuelume";
import "sileo/styles.css";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const SILEO_METHODS = {
  success: sileo.success,
  error: sileo.error,
  warning: sileo.warning,
  info: sileo.info,
} as const;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    SILEO_METHODS[type]({ title: message });
    if (type === "success") play("success");
    else if (type === "error") play("droplet");
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      <Toaster
        position="top-center"
        offset={{ top: 20 }}
        theme="light"
        options={{ duration: 4000 }}
      />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
