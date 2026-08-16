"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";

export default function AddClientModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (client: { id: string; name: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          monthlyFee: 0,
          currency: "USD",
          startDate: new Date().toISOString().slice(0, 10),
          billingDay: 1,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al crear el cliente.");
        return;
      }
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary">Nuevo cliente</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Nombre del cliente *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ej. Empresa Ejemplo S.A."
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
