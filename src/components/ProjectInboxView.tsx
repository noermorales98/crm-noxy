"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, SentIcon, Archive01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

interface EmailListItem {
  id: string;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  type: "RECEIVED" | "SENT";
  isRead: boolean;
  receivedAt: string;
}

interface EmailDetail extends EmailListItem {
  bodyText: string | null;
  bodyHtml: string | null;
  ccAddress: string | null;
}

const FOLDERS = [
  { key: "inbox", label: "Bandeja de entrada", icon: Mail01Icon },
  { key: "sent", label: "Enviados", icon: SentIcon },
  { key: "archived", label: "Archivados", icon: Archive01Icon },
] as const;

export default function ProjectInboxView({ companyId }: { companyId: string }) {
  const [folder, setFolder] = useState<"inbox" | "sent" | "archived">("inbox");
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setSelected(null);
    setLoading(true);
    fetch(`/api/emails?companyId=${companyId}&folder=${folder}`)
      .then((r) => r.json())
      .then((data) => setEmails(Array.isArray(data.emails) ? data.emails : []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  }, [companyId, folder]);

  const openEmail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/emails/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelected(detail);
        setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
      }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false); }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6">
      <div className="flex items-center gap-1 mb-5 border-b border-border-subtle">
        {FOLDERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFolder(f.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${folder === f.key ? "border-accent-charcoal text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
          >
            <HugeiconsIcon icon={f.icon} size={14} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
        {selected ? (
          <div>
            <div className="px-6 py-4 border-b border-border-subtle flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary mb-2">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
                  Volver a la lista
                </button>
                <h3 className="text-base font-bold text-text-primary truncate">{selected.subject || "(Sin asunto)"}</h3>
                <p className="text-xs text-text-secondary mt-1">
                  {selected.fromName || selected.fromAddress} · {new Date(selected.receivedAt).toLocaleString("es-MX")}
                </p>
              </div>
            </div>
            <div className="p-6">
              {selected.bodyHtml ? (
                <iframe srcDoc={selected.bodyHtml} sandbox="allow-same-origin" className="w-full border-0" style={{ minHeight: "400px" }} title="Cuerpo del correo" />
              ) : selected.bodyText ? (
                <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">{selected.bodyText}</pre>
              ) : (
                <p className="text-sm text-text-secondary text-center py-10">Este correo no tiene contenido</p>
              )}
            </div>
          </div>
        ) : loading || loadingDetail ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-2">
            <HugeiconsIcon icon={Mail01Icon} size={28} className="opacity-30" />
            <p className="text-sm">Sin correos en esta carpeta</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {emails.map((e) => (
              <li key={e.id}>
                <button onClick={() => openEmail(e.id)} className="w-full flex items-center justify-between gap-3 px-6 py-3.5 text-left hover:bg-surface-sidebar/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${e.isRead ? "text-text-primary" : "text-text-primary font-bold"}`}>{e.subject || "(Sin asunto)"}</p>
                    <p className="text-xs text-text-secondary truncate">{e.type === "SENT" ? `Para: ${e.toAddress}` : e.fromName || e.fromAddress}</p>
                  </div>
                  <span className="text-[11px] text-text-secondary shrink-0">{new Date(e.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
