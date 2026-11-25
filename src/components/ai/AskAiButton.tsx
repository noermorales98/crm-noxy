"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useAi } from "@/src/hooks/useAi";
import type { PageContext } from "@/src/components/ai/AiProvider";
import { suggestedQuestions } from "@/src/lib/ai-ask";

/**
 * «Preguntarle a la IA»: declara el registro que se está viendo (cita, doc, deal, marca…) como contexto del asistente y
 * ofrece preguntas sugeridas según su tipo. Al elegir una, la burbuja se abre y la envía sola.
 */
export default function AskAiButton({ context, className, compact = false, labelFrom }: { context: PageContext; className?: string; compact?: boolean; labelFrom?: "lg" }) {
  const { setPageContext, ask, open } = useAi();
  const [menu, setMenu] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const key = `${context.page}:${context.id ?? ""}:${context.label ?? ""}`;

  useEffect(() => {
    setPageContext(context);
    return () => setPageContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPageContext]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const questions = suggestedQuestions(context.page);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label="Preguntar a la IA"
        className={className ?? "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-semibold text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus lg:min-h-9"}
        title="Preguntarle a la IA sobre esto"
      >
        <HugeiconsIcon icon={AiMagicIcon} size={16} aria-hidden="true" />
        <span className={compact ? "sr-only" : labelFrom === "lg" ? "hidden lg:inline" : "max-sm:sr-only"}>Preguntar a la IA</span>
        {!compact && <HugeiconsIcon icon={ArrowDown01Icon} size={14} aria-hidden="true" className={labelFrom === "lg" ? "hidden lg:block" : "max-sm:hidden"} />}
      </button>
      {menu && (
        <div role="menu" className="crm-floating-menu absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-surface border border-line bg-surface-elevated py-1">
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-text-secondary-strong">Preguntar sobre «{context.label ?? "esto"}»</p>
          {questions.map((q) => (
            <button
              key={q}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                ask(q);
              }}
              className="block min-h-11 w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-nav-hover lg:min-h-0"
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              open();
            }}
            className="block min-h-11 w-full border-t border-line px-3 py-2 text-left text-sm text-text-secondary-strong hover:bg-nav-hover lg:min-h-0"
          >
            Escribir mi propia pregunta…
          </button>
        </div>
      )}
    </div>
  );
}

/** Declara el registro abierto como contexto del asistente (sin botón): la burbuja ofrece entonces sus preguntas sugeridas. */
export function useAiPageContext(context: PageContext | null) {
  const { setPageContext } = useAi();
  const key = context ? `${context.page}:${context.id ?? ""}:${context.label ?? ""}` : "";
  useEffect(() => {
    setPageContext(context);
    return () => setPageContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPageContext]);
}

/** Componente sin interfaz para páginas de servidor. */
export function AiPageContext({ context }: { context: PageContext }) {
  useAiPageContext(context);
  return null;
}
