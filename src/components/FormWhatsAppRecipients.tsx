"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

type Recipient = { id: string; label: string | null; phone: string; apiKey: string };

export default function FormWhatsAppRecipients({ formId }: { formId: string }) {
  const { addToast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", phone: "", apiKey: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/whatsapp-recipients`);
      if (res.ok) setRecipients(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim() || !form.apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${formId}/whatsapp-recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ label: "", phone: "", apiKey: "" });
        addToast("Número agregado", "success");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || "No se pudo agregar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/forms/${formId}/whatsapp-recipients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      addToast("Número eliminado", "success");
    } else {
      addToast("No se pudo eliminar", "error");
    }
  };

  return (
    <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="text-sm font-bold text-text-primary">Avisos WhatsApp extra</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Además del owner, estos números reciben un aviso CallMeBot cuando alguien se registra en este formulario.
        </p>
      </div>
      <div className="p-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-xs text-text-secondary">Cargando…</p>
        ) : recipients.length === 0 ? (
          <p className="text-xs text-text-secondary">Aún no hay destinatarios extra.</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-lg overflow-hidden">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.label || "Sin nombre"}</p>
                  <p className="text-xs text-text-secondary truncate">{r.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
                  title="Eliminar"
                  aria-label={`Eliminar ${r.label || r.phone}`}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <input
            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
            placeholder="Nombre (ej. Ana)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <input
            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
            placeholder="Teléfono con lada (ej. +5215512345678)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
            placeholder="API key de CallMeBot"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
          />
          {/* Enlace en línea dentro de una frase: exento del tamaño mínimo de toque. */}
          <p className="text-xs text-text-secondary" data-check-ignore-tap>
            Obtén la API key enviando &quot;I allow callmebot to send me messages&quot; al número de{" "}
            <a href="https://www.callmebot.com/" target="_blank" rel="noreferrer" className="text-action-primary hover:underline">
              CallMeBot
            </a>
            .
          </p>
          <button
            type="submit"
            disabled={saving || !form.phone.trim() || !form.apiKey.trim()}
            className="crm-press inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2.5 rounded-control bg-action-primary hover:bg-action-secondary text-action-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
            {saving ? "Agregando…" : "Agregar número"}
          </button>
        </form>
      </div>
    </section>
  );
}
