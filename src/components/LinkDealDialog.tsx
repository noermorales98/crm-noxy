"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Segmented, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { formatMoney } from "@/src/lib/quote-format";

type Candidate = {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  stage: { name: string; isWon: boolean; isLost: boolean };
  contact: { id: string; firstName: string; lastName: string | null } | null;
};

const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-text-primary";

/** Enlaza un lead existente a un contacto, o crea uno nuevo ya ligado a él. */
export function LinkDealDialog({
  open,
  onClose,
  contactId,
  contactName,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onLinked: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, onClose);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [deals, setDeals] = useState<Candidate[] | null>(null);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("existing");
    setQuery("");
    setTitle(`${contactName}`);
    setValue("");
    setError(null);
    setDeals(null);
    let cancelled = false;
    fetch(`/api/contacts/${contactId}/deals`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("No se pudieron cargar los leads"))))
      .then((data) => !cancelled && setDeals(data))
      .catch((err) => !cancelled && (setDeals([]), setError(err.message)));
    return () => {
      cancelled = true;
    };
  }, [open, contactId, contactName]);

  if (!open) return null;

  const send = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar");
      }
      onLinked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (deals ?? []).filter(
    (d) => !q || `${d.title} ${d.contact?.firstName ?? ""} ${d.contact?.lastName ?? ""}`.toLowerCase().includes(q),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-deal-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="link-deal-title" className="text-base font-semibold text-text-primary">Enlazar lead a {contactName}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
          <Segmented
            label="Modo"
            value={mode}
            onChange={(v) => setMode(v as "existing" | "new")}
            options={[{ value: "existing", label: "Lead existente" }, { value: "new", label: "Crear lead nuevo" }]}
          />

          {mode === "existing" ? (
            <>
              <label className={LABEL}>
                Buscar lead
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título o nombre del contacto actual" className={`${inputCls} font-normal`} />
              </label>
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-label="Leads disponibles">
                {deals === null && <li className="py-3 text-center text-sm text-text-secondary">Cargando…</li>}
                {deals !== null && shown.length === 0 && <li className="py-3 text-center text-sm text-text-secondary">No hay leads que mostrar.</li>}
                {shown.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => send({ dealId: d.id })}
                      className="flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left hover:bg-nav-hover disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{d.title}</span>
                        <span className="block truncate text-xs text-text-secondary">
                          {d.stage.name} · {d.contact ? `ahora de ${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "sin contacto"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-text-primary">{formatMoney(d.value ?? 0, d.currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-secondary">Si el lead ya tenía otro contacto, pasará a este.</p>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send({ title, value, currency });
              }}
              className="flex flex-col gap-4"
            >
              <label className={LABEL}>
                Título del lead
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className={`${inputCls} font-normal`} />
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className={LABEL}>
                  Valor (opcional)
                  <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" className={`${inputCls} font-normal`} />
                </label>
                <label className={LABEL}>
                  Moneda
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} font-normal`}>
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-text-secondary">Se crea en la etapa «Lead» del pipeline comercial.</p>
              <button type="submit" disabled={busy || !title.trim()} className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-60">
                {busy ? "Guardando…" : "Crear y enlazar"}
              </button>
            </form>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
