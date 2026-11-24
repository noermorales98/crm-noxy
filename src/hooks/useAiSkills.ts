"use client";

import { useEffect, useState } from "react";
import type { AiSkill } from "@/src/lib/ai-skills";

// Una sola lectura compartida por el menú «/» y las sugerencias; se vuelve a leer al cambiar los ajustes.
let cache: AiSkill[] | null = null;
let inflight: Promise<AiSkill[]> | null = null;
const listeners = new Set<(skills: AiSkill[]) => void>();

function fetchSkills(): Promise<AiSkill[]> {
  inflight ??= fetch("/api/settings/ai-skills", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<AiSkill[]>) : []))
    .catch(() => [] as AiSkill[])
    .then((list) => {
      cache = list;
      inflight = null;
      listeners.forEach((l) => l(list));
      return list;
    });
  return inflight;
}

/** Descarta lo leído y lo vuelve a pedir (tras editar habilidades en los ajustes). */
export function refreshAiSkills() {
  cache = null;
  void fetchSkills();
}

/** Habilidades del asistente. `enabled=false` no pide nada hasta que haga falta. */
export function useAiSkills(enabled = true): AiSkill[] {
  const [skills, setSkills] = useState<AiSkill[]>(cache ?? []);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setSkills);
    if (cache) setSkills(cache);
    else void fetchSkills();
    return () => {
      listeners.delete(setSkills);
    };
  }, [enabled]);
  return skills;
}
