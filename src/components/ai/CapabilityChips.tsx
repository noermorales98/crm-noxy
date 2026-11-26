"use client";

import { useMemo, useState } from "react";
import { useAiSkills } from "@/src/hooks/useAiSkills";
import { buildCapabilityChips } from "@/src/lib/ai-capabilities";

/** Sugerencias de un chat nuevo: tus habilidades (/comandos) y ejemplos de lo que el asistente ya hace en el CRM. Al elegir una, se escribe en el mensaje para que la completes. */
export default function CapabilityChips({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  const skills = useAiSkills();
  // Otro grupo de ejemplos en cada chat nuevo.
  const [seed] = useState(() => String(Math.random()));
  const chips = useMemo(() => buildCapabilityChips(skills, seed, 6), [skills, seed]);

  return (
    <div role="group" aria-label="Sugerencias" className="crm-hscroll mt-4 flex w-[min(680px,100%)] gap-2 max-sm:justify-start max-sm:pr-6 sm:flex-wrap sm:justify-center">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip.text)}
          title={chip.text.trim()}
          className="shrink-0 whitespace-nowrap rounded-full border border-black/10 bg-white/70 px-3 py-1.5 max-sm:min-h-10 text-[13px] font-medium text-[#1D1D1F] outline-none transition hover:border-black/25 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#1D1D1F]/40 disabled:opacity-40"
        >
          {chip.kind === "skill" && <span className="mr-1.5 text-[#6E6E73]">/</span>}
          {chip.label}
        </button>
      ))}
    </div>
  );
}
