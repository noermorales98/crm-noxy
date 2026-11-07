"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Copy01Icon, Link01Icon, RefreshIcon, Share08Icon } from "@hugeicons/core-free-icons";

type ShareData = {
  isPublic: boolean;
  publicToken: string | null;
  url: string;
};

export default function ProjectSharePanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/share`);
    if (res.ok) setShare(await res.json());
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const shareUrl =
    typeof window !== "undefined" && share?.isPublic && share.publicToken
      ? `${window.location.origin}/proyecto/${share.publicToken}`
      : share?.url || "";

  const patch = async (body: Record<string, unknown>) => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setShare(await res.json());
    setLoading(false);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Compartir proyecto"
        aria-expanded={open}
        className={`crm-press flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-semibold transition-colors lg:min-h-10 ${
          share?.isPublic
            ? "bg-blue-50 text-blue-700"
            : "bg-surface-sidebar text-text-secondary hover:bg-nav-hover"
        }`}
        title="Compartir"
      >
        <HugeiconsIcon icon={Share08Icon} size={16} />
        <span className="hidden sm:inline">Compartir</span>
      </button>

      {open && (
        <div className="crm-floating-menu absolute right-0 top-full mt-1 w-80 bg-surface-elevated rounded-lg border border-border-subtle z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Compartir públicamente</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          </div>

          {!share?.isPublic ? (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">
                Crea un enlace de solo lectura para que otras personas vean el resumen, las tareas, los docs y los registros de este proyecto.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => patch({ isPublic: true })}
                className="w-full text-left p-3 rounded-lg border border-border-subtle hover:bg-nav-hover transition-colors disabled:opacity-50"
              >
                <p className="text-sm font-medium">Activar enlace público</p>
                <p className="text-xs text-text-secondary">Sin correo ni actividad interna.</p>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Enlace</label>
                <div className="flex gap-1">
                  <input readOnly value={shareUrl} className="crm-input flex-1 text-xs py-1.5 truncate" />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="p-2 rounded-lg bg-surface-sidebar hover:bg-nav-hover shrink-0"
                    title="Copiar"
                  >
                    {copied ? <HugeiconsIcon icon={Link01Icon} size={14} className="text-green-600" /> : <HugeiconsIcon icon={Copy01Icon} size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => patch({ regenerateToken: true })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg bg-surface-sidebar hover:bg-nav-hover disabled:opacity-50"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={12} />
                  Regenerar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => patch({ isPublic: false })}
                  className="flex-1 py-2 text-xs rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Desactivar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
