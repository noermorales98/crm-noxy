"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiChatIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import KbEditorAiModal from "@/src/components/kb/KbEditorAiModal";

export type SelectionSnapshot = { start: number; end: number; text: string };

interface Props {
  content: string;
  onReadSelection: () => SelectionSnapshot;
  onInsertAtEnd: (text: string) => void;
  onInsertAfter: (text: string, pos: number) => void;
  onSetContent: (text: string) => void;
  borderColor?: string;
  contentPad?: React.CSSProperties;
}

type AiAction = "summarize" | "improve" | "continue" | "draft";

const EMPTY_SELECTION: SelectionSnapshot = { start: 0, end: 0, text: "" };

function buildReplacedContent(
  base: string,
  replacement: string,
  sel: SelectionSnapshot
): string | null {
  if (!replacement) return null;

  const { start, end, text } = sel;
  if (end > start) {
    const s = Math.min(Math.max(0, start), base.length);
    const e = Math.min(Math.max(s, end), base.length);
    return base.slice(0, s) + replacement + base.slice(e);
  }

  if (text) {
    const idx = base.indexOf(text);
    if (idx !== -1) {
      return base.slice(0, idx) + replacement + base.slice(idx + text.length);
    }
    const trimmed = text.trim();
    if (trimmed && trimmed !== text) {
      const tIdx = base.indexOf(trimmed);
      if (tIdx !== -1) {
        return base.slice(0, tIdx) + replacement + base.slice(tIdx + trimmed.length);
      }
    }
  }

  return null;
}

export default function KbEditorAiBar({
  content,
  onReadSelection,
  onInsertAtEnd,
  onInsertAfter,
  onSetContent,
  borderColor,
  contentPad,
}: Props) {
  const { addToast } = useToast();
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [showDraftInput, setShowDraftInput] = useState(false);
  const [frozenSelection, setFrozenSelection] = useState<SelectionSnapshot>(EMPTY_SELECTION);
  const aiResultRef = useRef("");
  const contentSnapshotRef = useRef("");
  const selectionSnapshotRef = useRef<SelectionSnapshot>(EMPTY_SELECTION);

  const captureSelection = () => {
    const snap = onReadSelection();
    selectionSnapshotRef.current = snap;
    setFrozenSelection(snap);
    return snap;
  };

  const runAi = async (action: AiAction, extra?: { prompt?: string }) => {
    if (action !== "draft" && !content.trim()) {
      addToast("La página no tiene contenido para analizar", "error");
      return;
    }

    const sel = captureSelection();
    contentSnapshotRef.current = content;
    if ((action === "improve" || action === "continue") && !sel.text.trim()) {
      addToast("Selecciona un fragmento en el editor para Mejorar o Continuar, o usa Resumir/Redactar.", "info");
    }

    setAiAction(action);
    setAiResult("");
    aiResultRef.current = "";
    setModalOpen(true);
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/draft-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content,
          selection: sel.text.trim() || undefined,
          prompt: extra?.prompt,
        }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) {
        addToast(data.error ?? "Error al procesar", "error");
        setModalOpen(false);
        setAiAction(null);
        return;
      }
      aiResultRef.current = data.result;
      setAiResult(data.result);
    } catch {
      addToast("Error de conexión", "error");
      setModalOpen(false);
      setAiAction(null);
    } finally {
      setAiLoading(false);
    }
  };

  const closeModal = () => {
    if (aiLoading) return;
    setModalOpen(false);
    setAiAction(null);
    setAiResult("");
    aiResultRef.current = "";
  };

  const applyAndClose = (message: string, fn: () => void) => {
    fn();
    addToast(message, "success");
    closeModal();
  };

  const hasSelection = frozenSelection.text.trim().length > 0;
  const insertPos = hasSelection ? frozenSelection.end : content.length;

  const handleAiMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    captureSelection();
  };

  const handleReplaceSelection = () => {
    const result = aiResultRef.current;
    if (!result) return;

    const snap = selectionSnapshotRef.current;
    const base = contentSnapshotRef.current || content;
    const next = buildReplacedContent(base, result, snap);

    if (!next) {
      addToast("No se pudo ubicar la selección en el documento", "error");
      return;
    }

    applyAndClose("Selección reemplazada", () => onSetContent(next));
  };

  const handleReplaceAll = () => {
    const result = aiResultRef.current;
    if (!result) return;

    if (!window.confirm("¿Reemplazar todo el documento con el resultado de la IA? Esta acción no se puede deshacer desde aquí.")) {
      return;
    }

    applyAndClose("Documento reemplazado", () => onSetContent(result));
  };

  return (
    <>
      <div
        className="border-t border-b py-2.5 flex flex-col gap-2"
        style={{ ...contentPad, borderColor: borderColor ?? undefined }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <HugeiconsIcon icon={AiChatIcon} size={14} color="#0B0B18" />
          <span className="text-xs font-semibold text-text-primary mr-1">IA</span>
          {(["summarize", "improve", "continue"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onMouseDown={handleAiMouseDown}
              onClick={() => {
                setShowDraftInput(false);
                void runAi(a);
              }}
              disabled={aiLoading}
              className="text-xs px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {a === "summarize" ? "✦ Resumir" : a === "improve" ? "✦ Mejorar" : "✦ Continuar"}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={handleAiMouseDown}
            onClick={() => setShowDraftInput((v) => !v)}
            disabled={aiLoading}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              showDraftInput
                ? "bg-neutral-100 text-text-primary font-medium"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
          >
            ✦ Redactar
          </button>
        </div>

        {showDraftInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draftPrompt.trim()) {
                  captureSelection();
                  void runAi("draft", { prompt: draftPrompt });
                }
              }}
              placeholder="Describe qué quieres redactar..."
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-app focus:outline-none focus:border-neutral-400 text-text-primary placeholder:text-text-secondary"
            />
            <button
              type="button"
              onMouseDown={handleAiMouseDown}
              onClick={() => draftPrompt.trim() && void runAi("draft", { prompt: draftPrompt })}
              disabled={!draftPrompt.trim() || aiLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-black text-white font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            >
              Generar
            </button>
          </div>
        )}

        <p className="text-[10px] text-text-secondary">
          Tip: selecciona texto en el editor antes de Mejorar o Continuar para actuar solo sobre esa parte.
        </p>
      </div>

      <KbEditorAiModal
        open={modalOpen}
        loading={aiLoading}
        action={aiAction}
        result={aiResult}
        selectionPreview={
          frozenSelection.text
            ? frozenSelection.text.length > 80
              ? `${frozenSelection.text.slice(0, 80)}…`
              : frozenSelection.text
            : null
        }
        hasSelection={hasSelection}
        onClose={closeModal}
        onInsertBelow={() => {
          const result = aiResultRef.current;
          if (!result) return;
          applyAndClose("Insertado debajo", () => onInsertAfter(result, insertPos));
        }}
        onInsertAtEnd={() => {
          const result = aiResultRef.current;
          if (!result) return;
          applyAndClose("Insertado al final del documento", () => onInsertAtEnd(result));
        }}
        onReplaceSelection={handleReplaceSelection}
        onReplaceAll={handleReplaceAll}
        onCopy={async () => {
          await navigator.clipboard.writeText(aiResultRef.current).catch(() => {});
          addToast("Copiado al portapapeles", "success");
        }}
      />
    </>
  );
}
