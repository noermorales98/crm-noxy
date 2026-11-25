"use client";
import { ActionCard, type ActionCardData } from "@/src/components/ai/ActionCard";
import { parseActionJson } from "@/src/lib/action-json";

/** Un bloque ```action de la IA: tarjeta lista, «preparando» mientras escribe, o un aviso claro. Nunca se enseña el JSON. */
export function ActionBlock({ raw, streaming }: { raw: string; streaming?: boolean }) {
  if (streaming) {
    return (
      <div className="my-2 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-secondary" role="status">
        Preparando la acción…
      </div>
    );
  }
  const parsed = parseActionJson(raw);
  if (!parsed) {
    return (
      <div className="my-2 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-secondary" role="status">
        No pude preparar esta acción. Pídemelo de nuevo, por favor.
      </div>
    );
  }
  return <ActionCard action={parsed as unknown as ActionCardData} />;
}
