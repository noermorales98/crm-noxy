"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { Chip, useDialog, type ChipTone } from "@/src/components/ui";
import { formatMoney } from "@/src/lib/quote-format";
import { input as inputCls } from "@/src/lib/crm-ui";

export type DealQuote = { id: string; folio: string; status: string; total: number; currency: string; issuedAt: string };

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", PARCIAL: "Pago parcial", PAGADA: "Pagada", VENCIDA: "Vencida", RECHAZADA: "Rechazada",
};
const STATUS_TONE: Record<string, ChipTone> = { ACEPTADA: "done", PARCIAL: "hot", PAGADA: "done", VENCIDA: "late", RECHAZADA: "late" };

type Candidate = DealQuote & { clientName: string; deal: { id: string; title: string } | null };

/** Cotizaciones de un lead: lista, crear una nueva desde el lead o vincular una existente. */
export function DealQuotesPanel({ dealId, initialQuotes }: { dealId: string; initialQuotes: DealQuote[] }) {
  const [quotes, setQuotes] = useState<DealQuote[]>(initialQuotes);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, pickerOpen, () => setPickerOpen(false));

  const loadCandidates = useCallback(async () => {
    setCandidates(null);
    try {
      const res = await fetch("/api/quotes");
      const all = (res.ok ? await res.json() : []) as Candidate[];
      setCandidates(all.filter((quote) => quote.deal?.id !== dealId));
    } catch {
      setCandidates([]);
    }
  }, [dealId]);

  const openPicker = () => {
    setSearch("");
    setPickerOpen(true);
    void loadCandidates();
  };

  const link = async (quote: Candidate) => {
    setBusy(quote.id);
    setError(null);
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealId }) });
    setBusy(null);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo vincular.");
    setQuotes((current) => [{ id: quote.id, folio: quote.folio, status: quote.status, total: quote.total, currency: quote.currency, issuedAt: quote.issuedAt }, ...current]);
    setPickerOpen(false);
  };

  const unlink = async (quote: DealQuote) => {
    if (!confirm(`¿Desvincular la cotización ${quote.folio} de este lead? La cotización no se borra.`)) return;
    setBusy(quote.id);
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealId: null }) });
    setBusy(null);
    if (res.ok) setQuotes((current) => current.filter((item) => item.id !== quote.id));
    else setError("No se pudo desvincular.");
  };

  const needle = search.trim().toLowerCase();
  const visible = (candidates ?? []).filter((quote) => !needle || quote.folio.toLowerCase().includes(needle) || quote.clientName.toLowerCase().includes(needle));

  return (
    <section className="rounded-surface border border-line bg-surface-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <p className="text-sm font-semibold text-text-primary">Cotizaciones</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openPicker} className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line px-3 text-xs font-semibold text-text-primary hover:bg-nav-hover lg:min-h-9">
            <HugeiconsIcon icon={Link01Icon} size={14} /> Vincular existente
          </button>
          <Link href={`/cotizaciones/nueva?dealId=${dealId}`} className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control bg-action-primary px-3 text-xs font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-9">
            <HugeiconsIcon icon={Add01Icon} size={14} /> Nueva cotización
          </Link>
        </div>
      </div>
      {error && <p role="status" className="mx-5 mt-3 rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      {quotes.length === 0 ? (
        <p className="px-5 py-8 text-sm text-text-secondary">Este lead aún no tiene cotizaciones. Crea una con el valor y el cliente del lead, o vincula una que ya exista.</p>
      ) : (
        <ul className="divide-y divide-line">
          {quotes.map((quote) => (
            <li key={quote.id} className="flex items-center gap-3 px-5 py-3">
              <Link href={`/cotizaciones/${quote.folio}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">{quote.folio}</span>
                <span className="block text-xs text-text-secondary">{new Date(quote.issuedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
              </Link>
              <Chip tone={STATUS_TONE[quote.status] ?? "neutral"}>{STATUS_LABEL[quote.status] ?? quote.status}</Chip>
              <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{formatMoney(quote.total, quote.currency)}</span>
              <button type="button" disabled={busy === quote.id} onClick={() => unlink(quote)} aria-label={`Desvincular ${quote.folio}`} title="Desvincular" className="flex size-9 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary disabled:opacity-50">
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={() => setPickerOpen(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="link-quote-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="link-quote-title" className="text-base font-semibold text-text-primary">Vincular cotización</h3>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <div className="p-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por folio o cliente" className={inputCls} autoFocus />
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto border-t border-line">
              {candidates === null ? (
                <li className="px-5 py-6 text-sm text-text-secondary">Cargando cotizaciones…</li>
              ) : visible.length === 0 ? (
                <li className="px-5 py-6 text-sm text-text-secondary">No hay cotizaciones para vincular.</li>
              ) : (
                visible.map((quote) => (
                  <li key={quote.id}>
                    <button type="button" disabled={busy === quote.id} onClick={() => link(quote)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-nav-hover disabled:opacity-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{quote.folio} · {quote.clientName}</span>
                        <span className="block truncate text-xs text-text-secondary">{quote.deal ? `Hoy en: ${quote.deal.title}` : "Sin lead"} · {STATUS_LABEL[quote.status] ?? quote.status}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">{formatMoney(quote.total, quote.currency)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
