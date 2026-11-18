"use client";

import { CheckmarkCircle02Icon, Contact01Icon, SparklesIcon, Task01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "./LandingMocks";
import { DecidePreview, SourcesPreview, SuggestionPreview } from "./StepPreviews";
import { useInView, useLoop } from "./useLoop";

type Step = { title: string; text: string; icon: IconSvgElement; preview: React.ReactNode; card: string; chip: string; solid: string; ring: string };

const STEPS: Step[] = [
  { title: "Conecta tus fuentes", text: "Formularios, agenda en línea, Granola o Notion llevan todo al CRM.", icon: Contact01Icon, preview: <SourcesPreview />, card: "bg-[#EEF1FF]", chip: "bg-[#DDE3FE] text-[#3545D6]", solid: "bg-[#3545D6]", ring: "ring-[#3545D6]/40" },
  { title: "La IA propone", text: "Tras cada reunión sugiere tareas, citas de seguimiento y contactos.", icon: SparklesIcon, preview: <SuggestionPreview />, card: "bg-violet-50", chip: "bg-violet-100 text-violet-700", solid: "bg-violet-600", ring: "ring-violet-400/50" },
  { title: "Tú decides", text: "Agregas lo que sirve y descartas el resto. Nada se crea solo.", icon: Task01Icon, preview: <DecidePreview />, card: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-700", solid: "bg-emerald-600", ring: "ring-emerald-400/50" },
];

/** Tres pasos con una línea de avance: el paso activo se eleva, los hechos se marcan y todo se repite solo. */
export default function HowItWorks() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  const tick = useLoop(inView, 3, 3, 1300, 2200);
  return (
    <div ref={ref}>
      <ol className="grid gap-5 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const done = tick > i;
          const active = tick === i;
          return (
            <li key={step.title} className={`rounded-surface p-5 transition-all duration-300 sm:p-6 ${step.card} ${active ? `-translate-y-1.5 ring-2 ${step.ring}` : "ring-0"} ${!active && !done ? "opacity-75" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${done || active ? `${step.solid} text-white` : step.chip}`}>
                  {done ? <Icon icon={CheckmarkCircle02Icon} size={20} /> : i + 1}
                </span>
                <span className={`flex size-9 items-center justify-center rounded-control ${step.chip}`}><Icon icon={step.icon} size={18} /></span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-text-secondary-strong">{step.text}</p>
              <div className="mt-5 rounded-control bg-surface-elevated p-3">{step.preview}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
