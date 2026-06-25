"use client";

import { useEffect, useState } from "react";
import { AI_MODELS } from "@/src/lib/ai-models";
import { Pencil, Trash2, Plus, X, Check, RotateCcw } from "lucide-react";

interface CustomModel {
  id: string;
  modelId: string;
  name: string;
  group: string;
  description: string;
  tags: string;
  enabled: boolean;
}

const EMPTY_FORM = { modelId: "", name: "", group: "Personalizados", description: "", tags: "" };

export default function AiModelsPage() {
  const [customs, setCustoms] = useState<CustomModel[]>([]);
  const [hiddenBuiltins, setHiddenBuiltins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingBuiltin, setPendingBuiltin] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/ai-models", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCustoms(data.models ?? []);
        setHiddenBuiltins(Array.isArray(data.hiddenBuiltins) ? data.hiddenBuiltins : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: CustomModel) => {
    setEditId(m.id);
    setForm({
      modelId: m.modelId,
      name: m.name,
      group: m.group,
      description: m.description,
      tags: JSON.parse(m.tags || "[]").join(", "),
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = editId
        ? await fetch(`/api/settings/ai-models/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch("/api/settings/ai-models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al guardar");
        return;
      }

      const saved: CustomModel = await res.json();
      if (editId) {
        setCustoms((prev) => prev.map((m) => (m.id === editId ? saved : m)));
      } else {
        setCustoms((prev) => [...prev, saved]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustom = async (id: string) => {
    const res = await fetch(`/api/settings/ai-models/${id}`, { method: "DELETE" });
    if (res.ok) setCustoms((prev) => prev.filter((m) => m.id !== id));
    setDeleteId(null);
  };

  const toggleBuiltin = async (modelId: string, action: "hide" | "restore") => {
    const res = await fetch("/api/settings/ai-models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setHiddenBuiltins(data.hiddenBuiltins);
    } else {
      alert(data.error || `Error ${res.status}`);
    }
    setPendingBuiltin(null);
  };

  const field = (label: string, key: keyof typeof form, opts?: { placeholder?: string; hint?: string; required?: boolean }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">
        {label} {opts?.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        placeholder={opts?.placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        disabled={key === "modelId" && !!editId}
        className="w-full px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm disabled:opacity-50"
      />
      {opts?.hint && <p className="text-xs text-text-secondary">{opts.hint}</p>}
    </div>
  );

  const builtinsExcludingChatbase = AI_MODELS.filter((m) => m.id !== "chatbase");

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Modelos de IA</h1>
            <p className="text-sm text-text-secondary mt-1">
              Agrega modelos personalizados de OpenRouter o edita los existentes.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-accent-charcoal text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
          >
            <Plus size={14} />
            Agregar modelo
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-border-subtle p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId ? "Editar modelo" : "Nuevo modelo de OpenRouter"}
              </h2>
              <button onClick={closeForm} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {field("Model ID", "modelId", {
                placeholder: "meta-llama/llama-3.3-70b-instruct:free",
                hint: "Copia el ID exacto de openrouter.ai/models",
                required: true,
              })}
              {field("Nombre para mostrar", "name", { placeholder: "Llama 3.3 70B", required: true })}
              {field("Grupo", "group", { placeholder: "Meta, Google, Qwen…" })}
              {field("Descripción", "description", { placeholder: "Descripción breve del modelo" })}
              {field("Etiquetas", "tags", { placeholder: "General, Rápido, Código…", hint: "Separadas por coma" })}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || !form.modelId.trim() || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-charcoal text-white text-sm font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-40"
                >
                  <Check size={13} />
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-text-secondary border border-border-subtle rounded-lg hover:bg-surface-sidebar transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Custom models */}
        <div className="bg-white rounded-xl border border-border-subtle overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Modelos personalizados</h2>
            <span className="text-xs text-text-secondary">{customs.length} modelo{customs.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-text-secondary">Cargando…</div>
          ) : customs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-text-secondary mb-2">No hay modelos personalizados aún.</p>
              <button onClick={openAdd} className="text-sm text-[#6366F1] hover:underline">Agregar el primero</button>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {customs.map((m) => {
                const tags: string[] = JSON.parse(m.tags || "[]");
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">{m.name}</span>
                        <span className="text-xs text-text-secondary/60 font-mono">{m.modelId}</span>
                        {tags.map((t) => (
                          <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-sidebar text-text-secondary">
                            {t}
                          </span>
                        ))}
                      </div>
                      {m.description && <p className="text-xs text-text-secondary mt-0.5">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sidebar transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {deleteId === m.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteCustom(m.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-2 py-1 text-xs border border-border-subtle rounded-md hover:bg-surface-sidebar transition-colors text-text-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(m.id)}
                          className="p-1.5 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Built-in models */}
        <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Modelos integrados</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Los modelos eliminados no aparecerán en el selector.
                {hiddenBuiltins.length > 0 && ` ${hiddenBuiltins.length} oculto${hiddenBuiltins.length !== 1 ? "s" : ""}.`}
              </p>
            </div>
            <span className="text-xs text-text-secondary">{AI_MODELS.length} modelos</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {/* Chatbase — always visible, not deletable */}
            {AI_MODELS.filter((m) => m.id === "chatbase").map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#6366F1] font-semibold">{m.group}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-sidebar text-text-secondary font-semibold">Fijo</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 font-mono">{m.id}</p>
                </div>
              </div>
            ))}

            {/* Rest of built-ins */}
            {builtinsExcludingChatbase.map((m) => {
              const isHidden = hiddenBuiltins.includes(m.id);
              return (
                <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${isHidden ? "opacity-40" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isHidden ? "line-through text-text-secondary" : "text-text-primary"}`}>
                        {m.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#6366F1] font-semibold">{m.group}</span>
                      {isHidden && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-sidebar text-text-secondary font-semibold">Oculto</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 font-mono">{m.id}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isHidden ? (
                      <button
                        onClick={() => toggleBuiltin(m.id, "restore")}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary border border-border-subtle rounded-md hover:bg-surface-sidebar transition-colors"
                        title="Restaurar"
                      >
                        <RotateCcw size={10} />
                        Restaurar
                      </button>
                    ) : pendingBuiltin === m.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleBuiltin(m.id, "hide")}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setPendingBuiltin(null)}
                          className="px-2 py-1 text-xs border border-border-subtle rounded-md hover:bg-surface-sidebar transition-colors text-text-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPendingBuiltin(m.id)}
                        className="p-1.5 rounded-md text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
