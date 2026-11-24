"use client";

import { useEffect, useState } from "react";
import { suggestSkills, type AiSkill } from "@/src/lib/ai-skills";

// Una sola lectura por pestaña: las habilidades casi no cambian.
let cache: AiSkill[] | null = null;

/** Menú de habilidades: aparece al escribir «/» al inicio del mensaje y completa el comando al elegir una. */
export default function SkillMenu({ value, onPick }: { value: string; onPick: (command: string) => void }) {
  const [skills, setSkills] = useState<AiSkill[]>(cache ?? []);
  const wants = value.startsWith("/") && !/\s/.test(value);

  useEffect(() => {
    if (!wants || cache) return;
    let cancelled = false;
    fetch("/api/settings/ai-skills")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: AiSkill[]) => {
        cache = list;
        if (!cancelled) setSkills(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wants]);

  const matches = wants ? suggestSkills(value, skills) : [];
  if (!matches.length) return null;

  return (
    <div role="listbox" aria-label="Habilidades" className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-white py-1 text-[#1D1D1F] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      {matches.map((s) => (
        <button
          key={s.id}
          type="button"
          role="option"
          aria-selected="false"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(s.command)}
          className="block w-full px-4 py-2 text-left hover:bg-black/5"
        >
          <span className="text-sm font-semibold">/{s.command}</span>
          <span className="ml-2 text-xs text-[#6E6E73]">{s.description || s.name}</span>
        </button>
      ))}
    </div>
  );
}
