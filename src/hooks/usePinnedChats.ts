"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "noxy-pinned-chats";

function read(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Chats fijados arriba del historial. Se guardan en este navegador (no en la base de datos). */
export function usePinnedChats() {
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => {
    setPinned(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPinned(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { pinned, toggle };
}
