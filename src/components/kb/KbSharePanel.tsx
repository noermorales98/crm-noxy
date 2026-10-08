"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Link2, RefreshCw, Share2, X } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { KbShareRole } from "@prisma/client";
import {
  DEFAULT_SHARE_ICON_BG,
  SHARE_FAVICON_ICONS,
  iconStrokeForBackground,
  shareFaviconIcon,
} from "@/src/lib/share-favicon";

type ShareData = {
  id: string;
  token: string;
  role: KbShareRole;
  isEnabled: boolean;
  includeChildren: boolean;
};

const ROLE_OPTIONS: { value: KbShareRole; label: string; desc: string }[] = [
  { value: "READER", label: "Lector", desc: "Solo lectura" },
  { value: "COMMENTATOR", label: "Comentarista", desc: "Notas y sugerencias sin editar" },
  { value: "EDITOR", label: "Editor", desc: "Puede editar el documento" },
];

export default function KbSharePanel({
  pageId,
  isFolder,
  pendingSuggestions = 0,
}: {
  pageId: string;
  isFolder?: boolean;
  pendingSuggestions?: number;
}) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicTitle, setPublicTitle] = useState("");
  const [shareTags, setShareTags] = useState("");
  const [shareIcon, setShareIcon] = useState<string | null>(null);
  const [shareIconBg, setShareIconBg] = useState(DEFAULT_SHARE_ICON_BG);
  const savedMeta = useRef({ publicTitle: "", shareTags: "" });
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/kb/${pageId}/share`);
    if (res.ok) {
      const data = await res.json();
      setShare(data.share);
      const nextTitle = typeof data.publicTitle === "string" ? data.publicTitle : "";
      const nextTags = typeof data.shareTags === "string" ? data.shareTags : "";
      setPublicTitle(nextTitle);
      setShareTags(nextTags);
      setShareIcon(typeof data.shareIcon === "string" ? data.shareIcon : null);
      setShareIconBg(typeof data.shareIconBg === "string" ? data.shareIconBg : DEFAULT_SHARE_ICON_BG);
      savedMeta.current = { publicTitle: nextTitle, shareTags: nextTags };
    }
  }, [pageId]);

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
    typeof window !== "undefined" && share?.isEnabled
      ? `${window.location.origin}/docs/s/${share.token}`
      : "";
  const previewBg = /^#[0-9a-fA-F]{6}$/.test(shareIconBg) ? shareIconBg : DEFAULT_SHARE_ICON_BG;
  const previewIcon = shareFaviconIcon(shareIcon);

  const enableShare = async (role: KbShareRole) => {
    setLoading(true);
    const res = await fetch(`/api/kb/${pageId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, includeChildren: isFolder }),
    });
    if (res.ok) setShare(await res.json());
    setLoading(false);
  };

  const updateShare = async (patch: Record<string, unknown>) => {
    setLoading(true);
    const res = await fetch(`/api/kb/${pageId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setShare(await res.json());
    setLoading(false);
  };

  const saveFolderMeta = () => {
    if (
      publicTitle === savedMeta.current.publicTitle &&
      shareTags === savedMeta.current.shareTags
    ) {
      return;
    }
    savedMeta.current = { publicTitle, shareTags };
    void updateShare({ publicTitle, shareTags });
  };

  const saveFavicon = (icon: string | null, background: string) => {
    setShareIcon(icon);
    setShareIconBg(background);
    void updateShare({
      shareIcon: icon,
      shareIconBg: icon ? background : null,
    });
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
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          share?.isEnabled
            ? "bg-blue-50 text-blue-700"
            : "bg-surface-sidebar text-text-secondary hover:bg-nav-hover"
        }`}
        title="Compartir"
      >
        <Share2 size={12} />
        <span className="hidden sm:inline">Compartir</span>
        {pendingSuggestions > 0 && (
          <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
            {pendingSuggestions}
          </span>
        )}
      </button>

      {open && (
        <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Compartir públicamente</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
              <X size={14} />
            </button>
          </div>

          {!share?.isEnabled ? (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">
                Crea un enlace para que clientes o el público accedan a {isFolder ? "esta carpeta" : "este documento"}.
              </p>
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  onClick={() => enableShare(opt.value)}
                  className="w-full text-left p-3 rounded-lg border border-border-subtle hover:bg-nav-hover transition-colors disabled:opacity-50"
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-text-secondary">{opt.desc}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Rol del enlace</label>
                <select
                  value={share.role}
                  disabled={loading}
                  onChange={(e) => updateShare({ role: e.target.value })}
                  className="crm-input w-full text-sm py-1.5"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {isFolder && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre al compartir</label>
                    <input
                      value={publicTitle}
                      disabled={loading}
                      onChange={(e) => setPublicTitle(e.target.value)}
                      onBlur={saveFolderMeta}
                      placeholder="Si lo dejas vacío, se usa el nombre de la carpeta"
                      className="crm-input w-full py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Etiquetas</label>
                    <input
                      value={shareTags}
                      disabled={loading}
                      onChange={(e) => setShareTags(e.target.value)}
                      onBlur={saveFolderMeta}
                      placeholder="propuesta, diseño"
                      className="crm-input w-full py-1.5 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-text-secondary">Favicon</label>
                  {shareIcon && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveFavicon(null, DEFAULT_SHARE_ICON_BG)}
                      className="text-[11px] text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                      Usar el del CRM
                    </button>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: previewBg }}
                  >
                    {previewIcon ? (
                      <HugeiconsIcon
                        icon={previewIcon.icon}
                        size={22}
                        color={iconStrokeForBackground(previewBg)}
                      />
                    ) : (
                      <span className="text-[10px] font-medium text-white/80">CRM</span>
                    )}
                  </span>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    Fondo
                    <input
                      type="color"
                      value={previewBg}
                      disabled={loading || !shareIcon}
                      onChange={(event) => saveFavicon(shareIcon, event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-border-subtle bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Color de fondo del favicon"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {SHARE_FAVICON_ICONS.map((item) => {
                    const selected = shareIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={loading}
                        aria-label={item.id}
                        aria-pressed={selected}
                        onClick={() => saveFavicon(item.id, shareIconBg || DEFAULT_SHARE_ICON_BG)}
                        className={`flex size-9 items-center justify-center rounded-lg border ${
                          selected
                            ? "border-action-primary bg-nav-active text-action-primary"
                            : "border-transparent text-text-primary hover:bg-nav-hover"
                        }`}
                      >
                        <HugeiconsIcon icon={item.icon} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

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
                    {copied ? <Link2 size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => updateShare({ regenerateToken: true })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg bg-surface-sidebar hover:bg-nav-hover disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Regenerar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => updateShare({ isEnabled: false })}
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
