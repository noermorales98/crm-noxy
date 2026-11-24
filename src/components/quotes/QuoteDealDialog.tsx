"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Segmented, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { formatMoney } from "@/src/lib/quote-format";
import { SaleDateChoice, type SaleDateOption } from "@/src/components/quotes/SaleDateChoice";

type StageOption = { id: string; name: string; isWon: boolean; isLost: boolean; pipeline: string };
type DealOption = { id: string; title: string; value: number | null; currency: string; isArchived: boolean; stage: { name: string; isWon: boolean } };

const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-text-primary";

/**
 * Conecta una cotización con un deal: crea uno nuevo con los datos de la cotización o vincula uno que ya existe.
 * Si hay dos fechas distintas para la venta, pregunta cuál es la correcta antes de guardar.
 */
export function QuoteDealDialog({
  open,
  onClose,
  quote,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  quote: { id: string; folio: string; clientName: string; total: number; currency: string; status: string };
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, open, onClose);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [stages, setStages] = useState<StageOption[]>([]);
  const [stageId, setStageId] = useState("");
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [deals, setDeals] = useState<DealOption[] | null>(null);
  const [choices, setChoices] = useState<SaleDateOption[] | null>(null);
  const [saleDate, setSaleDate] = useState("");
  const [pendingDealId, setPendingDealId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Etapas de todos los pipelines; si la cotización ya tiene aceptación o pago se propone una etapa ganada.
  useEffect(() => {
    if (!open) return;
    setMode("new");
    setTitle(quote.clientName);
    setQuery("");
    setChoices(null);
    setSaleDate("");
    setPendingDealId(null);
    setError(null);
    let cancelled = false;
    fetch("/api/pipelines?slim=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((pipelines: { name: string; stages: { id: string; name: string; isWon?: boolean; isLost?: boolean }[] }[]) => {
        if (cancelled) return;
        const all = pipelines.flatMap((pipeline) => pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name, isWon: !!stage.isWon, isLost: !!stage.isLost, pipeline: pipeline.name })));
        setStages(all.filter((stage) => !stage.isLost));
        const sold = ["ACEPTADA", "PARCIAL", "PAGADA"].includes(quote.status);
        setStageId((sold ? all.find((stage) => stage.isWon) : all.find((stage) => !stage.isWon && !stage.isLost))?.id ?? all[0]?.id ?? "");
      })
      .catch(() => !cancelled && setStages([]));
    return () => {
      cancelled = true;
    };
  }, [open, quote.clientName, quote.status]);

  // Buscador de deals existentes (incluye archivados).
  useEffect(() => {
    if (!open || mode !== "existing") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/deals/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((list) => !cancelled && setDeals(Array.isArray(list) ? list : []))
        .catch(() => !cancelled && setDeals([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, mode, query]);

  if (!open) return null;

  /** Envía; si el servidor detecta fechas distintas (409) muestra la pregunta y se repite con la elegida. */
  const submit = async (kind: "new" | "link", dealId?: string, chosenDate?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res =
        kind === "new"
          ? await fetch(`/api/quotes/${quote.id}/deal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId, title, ...(chosenDate ? { saleDate: chosenDate } : {}) }) })
          : await fetch(`/api/quotes/${quote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealId, ...(chosenDate ? { saleDate: chosenDate } : {}) }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.needsDate) {
        setChoices(data.choices);
        setSaleDate(data.choices[0]?.value ?? "");
        setPendingDealId(kind === "link" ? (dealId ?? null) : null);
        return;
      }
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const asking = choices !== null;
  const confirmDate = () => submit(pendingDealId ? "link" : "new", pendingDealId ?? undefined, saleDate);
  const wonStage = stages.find((stage) => stage.id === stageId)?.isWon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="quote-deal-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="quote-deal-title" className="text-base font-semibold text-text-primary">Conectar {quote.folio} con un deal</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
          {asking ? (
            <>
              <SaleDateChoice choices={choices} value={saleDate} onChange={setSaleDate} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setChoices(null)} disabled={busy} className="min-h-11 flex-1 rounded-control bg-surface-sidebar text-sm font-semibold text-text-secondary hover:bg-nav-active">
                  Volver
                </button>
                <button type="button" onClick={confirmDate} disabled={busy || !saleDate} className="crm-press min-h-11 flex-1 rounded-control bg-action-primary text-sm font-semibold text-action-primary-foreground disabled:opacity-60">
                  {busy ? "Guardando…" : "Usar esta fecha"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Segmented label="Modo" value={mode} onChange={(v) => setMode(v as "new" | "existing")} options={[{ value: "new", label: "Crear deal nuevo" }, { value: "existing", label: "Vincular a uno existente" }]} />

              {mode === "new" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit("new");
                  }}
                  className="flex flex-col gap-4"
                >
                  <label className={LABEL}>
                    Título del deal
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required className={`${inputCls} font-normal`} />
                  </label>
                  <label className={LABEL}>
                    Pipeline y etapa
                    <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={`${inputCls} font-normal`}>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.pipeline} · {stage.name}{stage.isWon ? " (ganado)" : ""}</option>
                      ))}
                    </select>
                  </label>
                  <p className="rounded-control bg-surface-sidebar px-3 py-2 text-xs text-text-secondary">
                    Valor y cliente salen de la cotización: <strong className="text-text-primary">{formatMoney(quote.total, quote.currency)}</strong> · {quote.clientName}.
                    {wonStage ? " Si la cotización trae fechas distintas, te preguntaré cuál es la de la venta." : ""}
                  </p>
                  <button type="submit" disabled={busy || !title.trim() || !stageId} className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-60">
                    {busy ? "Creando…" : "Crear deal y conectar"}
                  </button>
                </form>
              ) : (
                <>
                  <label className={LABEL}>
                    Buscar deal
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título, contacto o empresa" className={`${inputCls} font-normal`} autoFocus />
                  </label>
                  <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-label="Deals disponibles">
                    {deals === null && <li className="py-3 text-center text-sm text-text-secondary">Cargando…</li>}
                    {deals !== null && deals.length === 0 && <li className="py-3 text-center text-sm text-text-secondary">No hay deals que mostrar.</li>}
                    {(deals ?? []).map((deal) => (
                      <li key={deal.id}>
                        <button type="button" disabled={busy} onClick={() => submit("link", deal.id)} className="flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left hover:bg-nav-hover disabled:opacity-60">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-text-primary">{deal.title}</span>
                            <span className="block truncate text-xs text-text-secondary">{deal.stage.name}{deal.isArchived ? " · archivado" : ""}</span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-text-primary">{formatMoney(deal.value ?? 0, deal.currency)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
