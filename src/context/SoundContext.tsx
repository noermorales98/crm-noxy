"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { play, setEnabled as setCuelumeEnabled } from "cuelume";

const SOUND_ENABLED_KEY = "noxy-sound-enabled";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readStoredPreference(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "1";
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const initial = readStoredPreference();
    setEnabled(initial);
    setCuelumeEnabled(initial);
  }, []);

  useEffect(() => {
    function isFineMouseButton(target: EventTarget | null): target is HTMLButtonElement {
      const button = (target as HTMLElement)?.closest?.("button");
      return !!button && !button.disabled;
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && isFineMouseButton(e.target)) play("press");
    }
    function handlePointerUp(e: PointerEvent) {
      if (e.pointerType === "mouse" && isFineMouseButton(e.target)) play("release");
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, next ? "1" : "0");
      setCuelumeEnabled(next);
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ enabled, toggle }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSoundSettings must be used inside SoundProvider");
  return ctx;
}
