"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Segmented, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { renderQuoteEmailHtml, type QuoteEmailQuote } from "@/src/lib/quote-email";

type Draft = {
  to: string;
  subject: string;
  message: string;
  businessName: string;
  publicUrl: string;
  fromName: string;
  limits: { maxFiles: number; maxFileBytes: number; maxTotalBytes: number };
};

const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-text-primary";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Borrador del correo de la cotización: editar asunto y mensaje, ver la vista previa y adjuntar archivos antes de enviar. */
export function QuoteSendDialog({
  open,
  onClose,
  quote,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  quote: QuoteEmailQuote & { id: string };
  onSent: (result: { emailSent: boolean; viaCompany: boolean; to: string }) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useDialog(dialogRef, open, onClose);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(null);
    setFiles([]);
    setTab("edit");
    setError(null);
    let cancelled = false;
    fetch(`/api/quotes/${quote.id}/send`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo preparar el borrador");
        return data as Draft;
      })
      .then((data) => {
        if (cancelled) return;
        setDraft(data);
        setSubject(data.subject);
        setMessage(data.message);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [open, quote.id]);

  const previewHtml = useMemo(
    () => (draft ? renderQuoteEmailHtml({ quote, businessName: draft.businessName, publicUrl: draft.publicUrl, message }) : ""),
    [draft, quote, message],
  );

  if (!open) return null;

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = (list: FileList | null) => {
    if (!list || !draft) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (file.size > draft.limits.maxFileBytes) {
        setError(`«${file.name}» supera ${formatSize(draft.limits.maxFileBytes)}`);
        continue;
      }
      next.push(file);
    }
    if (next.length > draft.limits.maxFiles) {
      setError(`Máximo ${draft.limits.maxFiles} archivos`);
      return;
    }
    if (next.reduce((s, f) => s + f.size, 0) > draft.limits.maxTotalBytes) {
      setError(`Los adjuntos no pueden pasar de ${formatSize(draft.limits.maxTotalBytes)} en total`);
      return;
    }
    setError(null);
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!draft) return;
    if (!subject.trim()) return setError("El asunto no puede estar vacío");
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("subject", subject.trim());
      body.set("message", message);
      files.forEach((f) => body.append("files", f));
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      onSent({ emailSent: !!data.emailSent, viaCompany: !!data.viaCompany, to: draft.to });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-send-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="quote-send-title" className="text-base font-semibold text-text-primary">Borrador del correo · {quote.folio}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
          {!draft && !error && <p className="py-6 text-center text-sm text-text-secondary">Preparando borrador…</p>}

          {draft && (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
                <span>Para: <strong className="font-semibold text-text-primary">{draft.to}</strong></span>
                <span>De: <strong className="font-semibold text-text-primary">{draft.fromName}</strong></span>
              </div>

              <Segmented
                label="Vista"
                value={tab}
                onChange={(v) => setTab(v as "edit" | "preview")}
                options={[{ value: "edit", label: "Editar" }, { value: "preview", label: "Vista previa" }]}
              />

              {tab === "edit" ? (
                <>
                  <label className={LABEL}>
                    Asunto
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} className={`${inputCls} font-normal`} />
                  </label>
                  <label className={LABEL}>
                    Descripción / mensaje
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={8}
                      maxLength={10000}
                      className={`${inputCls} font-normal`}
                    />
                    <span className="text-xs font-normal text-text-secondary">
                      La tabla de conceptos, el total y el botón «Ver cotización y pagar» se agregan automáticamente debajo.
                    </span>
                  </label>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-text-primary">Archivos adjuntos</span>
                    <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                    <div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={files.length >= draft.limits.maxFiles}
                        className="crm-press min-h-11 rounded-control border border-line px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-nav-hover disabled:opacity-50 lg:min-h-9"
                      >
                        Adjuntar archivos
                      </button>
                    </div>
                    {files.length > 0 && (
                      <ul className="flex flex-col gap-1" aria-label="Adjuntos">
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-1.5 text-sm">
                            <span className="min-w-0 truncate text-text-primary">{f.name}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
                              {formatSize(f.size)}
                              <button
                                type="button"
                                aria-label={`Quitar ${f.name}`}
                                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                                className="flex size-7 min-h-0! min-w-0! items-center justify-center rounded-control hover:bg-nav-hover"
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="text-xs text-text-secondary">
                      Hasta {draft.limits.maxFiles} archivos, {formatSize(draft.limits.maxFileBytes)} cada uno
                      {files.length > 0 && ` · usado ${formatSize(totalBytes)} de ${formatSize(draft.limits.maxTotalBytes)}`}.
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-text-primary"><span className="text-text-secondary">Asunto: </span><strong className="font-semibold">{subject || "(vacío)"}</strong></p>
                  <iframe title="Vista previa del correo" sandbox="" srcDoc={previewHtml} className="h-[420px] w-full rounded-control border border-line bg-white" />
                  {files.length > 0 && (
                    <p className="text-xs text-text-secondary">Adjuntos: {files.map((f) => f.name).join(", ")}</p>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="crm-press min-h-11 rounded-control px-4 py-2 text-sm font-medium text-text-primary hover:bg-nav-hover lg:min-h-9">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!draft || busy}
            className="crm-press flex min-h-11 items-center gap-2 rounded-control bg-brand-obsidian px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 lg:min-h-9"
          >
            <HugeiconsIcon icon={SentIcon} size={15} />
            {busy ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
