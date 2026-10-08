"use client";

import { useState } from "react";

type QuoteField = "notes" | "terms" | "item";

export function QuoteAiAssist({
  field,
  currentText,
  onApply,
  context,
}: {
  field: QuoteField;
  currentText: string;
  onApply: (text: string) => void;
  context: {
    clientName: string;
    clientCompany: string;
    currency: string;
    total: string;
    items: string[];
  };
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async (mode: "draft" | "improve") => {
    const text = mode === "improve"
      ? (instruction.trim() || "Mejora el texto actual para que sea más claro y profesional")
      : instruction.trim();
    if (!text) {
      setError("Escribe qué quieres generar");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/draft-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          instruction: text,
          currentText,
          ...context,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo generar el texto");
      setDraft(typeof data.result === "string" ? data.result : "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo generar el texto");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-semibold text-action-primary hover:underline"
      >
        Ayuda de IA
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-app p-3">
      <label className="text-xs font-semibold text-text-secondary">Qué debe decir</label>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary"
        placeholder="Ej. Redacta una intro para un paquete de redes sociales"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate("draft")}
          className="rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-action-primary-foreground disabled:opacity-60"
        >
          {busy ? "Generando…" : "Generar"}
        </button>
        {currentText.trim() && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate("improve")}
            className="rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-60"
          >
            Mejorar lo que ya escribí
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); setDraft(""); setError(""); }}
          className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-white"
        >
          Cerrar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {draft && (
        <div className="rounded-lg border border-border-subtle bg-white p-3">
          <p className="whitespace-pre-line text-sm text-text-primary">{draft}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => { onApply(draft); setOpen(false); setDraft(""); setInstruction(""); }}
              className="rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-action-primary-foreground"
            >
              Usar este texto
            </button>
            <button
              type="button"
              onClick={() => setDraft("")}
              className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-app"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
