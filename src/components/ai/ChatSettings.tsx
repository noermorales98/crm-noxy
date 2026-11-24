"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { useDialog } from "@/src/components/ui";
import { AiSkillsEditor } from "@/src/components/settings/AiSkillsEditor";
import { AiSchedulesPanel } from "@/src/components/settings/AiSchedulesPanel";
import { refreshAiSkills } from "@/src/hooks/useAiSkills";

type Tab = "skills" | "schedules";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "skills", label: "Habilidades" },
  { id: "schedules", label: "Programaciones" },
];

/** Engranaje discreto en la esquina del chat. Abre un panel con las habilidades (/comandos), la revisión de contenido y las programaciones del asistente. */
export default function ChatSettings() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("skills");
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    // Las habilidades pudieron cambiar: el menú «/» y las sugerencias las vuelven a leer.
    refreshAiSkills();
  };
  useDialog(panelRef, open, close);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajustes del asistente"
        aria-haspopup="dialog"
        title="Ajustes del asistente"
        className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full text-[#6E6E73] opacity-60 outline-none transition hover:bg-black/5 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#1D1D1F]/40"
      >
        <HugeiconsIcon icon={Settings01Icon} size={18} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90]">
            <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden="true" />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ajustes del asistente"
              className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-line bg-surface-app text-text-primary shadow-lg"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <h2 className="text-base font-semibold">Ajustes del asistente</h2>
                  <p className="text-xs text-text-secondary">Lo que cambies aquí vale para todos tus chats.</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar"
                  className="flex size-10 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
                </button>
              </div>

              <div role="tablist" aria-label="Secciones" className="flex gap-1 border-b border-line px-4 pt-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`chat-settings-tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls="chat-settings-panel"
                    onClick={() => setTab(t.id)}
                    className={`-mb-px min-h-10 border-b-2 px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${tab === t.id ? "border-action-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div id="chat-settings-panel" role="tabpanel" aria-labelledby={`chat-settings-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 [&>section]:mt-5">
                {tab === "skills" ? <AiSkillsEditor /> : <AiSchedulesPanel />}
              </div>

              <div className="border-t border-line px-5 py-3 text-xs text-text-secondary">
                Modelos y cuentas de IA:{" "}
                <Link href="/settings/ai-models" className="font-semibold text-action-ink underline-offset-2 hover:underline">
                  abrir ajustes completos
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
