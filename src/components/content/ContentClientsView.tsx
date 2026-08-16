"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MegaphoneIcon, Calendar01Icon, Delete01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

type ContentClient = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  context: string | null;
  isActive: boolean;
  publicToken: string;
  _count?: { items: number; phones: number };
};

const inputClass =
  "noxy-form-control";

function ClientModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ContentClient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "cliente");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(initial ? `/api/content/clients/${initial.id}` : "/api/content/clients", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, description, context }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div
        className="relative w-full sm:max-w-lg rounded-t-surface sm:rounded-surface border border-border-subtle bg-white p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {initial ? "Editar cliente / marca" : "Nuevo cliente / marca"}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="noxy-form-label mb-1">Nombre *</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ángeles Lomelí — Volver a Creer" />
          </div>

          <div>
            <label className="noxy-form-label mb-1">Tipo</label>
            <div className="flex gap-2">
              {[
                { v: "cliente", label: "Cliente" },
                { v: "marca", label: "Marca propia" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setKind(opt.v)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    kind === opt.v
                      ? "border-action-primary bg-nav-active text-action-primary font-semibold"
                      : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="noxy-form-label mb-1">Descripción breve</label>
            <input
              className={inputClass}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Autora de desarrollo personal"
            />
          </div>

          <div>
            <label className="noxy-form-label mb-1">
              Contexto para la IA
              <span className="font-normal text-text-secondary/70"> — voz de marca, audiencia, productos, tono</span>
            </label>
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={context ?? ""}
              onChange={(e) => setContext(e.target.value)}
              placeholder={"Ej. Marca personal de una autora mexicana de 50+ años. Publica reflexiones sobre volver a confiar, el amor propio y la esperanza. Audiencia: mujeres 35-60 en Facebook. Tono cálido, cercano, sin tecnicismos. Producto principal: libro \"Volver a Creer\"."}
            />
            <p className="text-[11px] text-text-secondary mt-1">
              La IA usará esta información para proponerte ideas y calendarios de contenido a la medida.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="noxy-form-button flex-1 text-sm"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentClientsView() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ContentClient[] | null>(null);
  const [modalOpen, setModalOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<ContentClient | null>(null);
  const [deleting, setDeleting] = useState<ContentClient | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = () => {
    fetch("/api/content/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  };

  useEffect(load, []);

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    await fetch(`/api/content/clients/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    setDeleting(null);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">Gestión de contenido</h1>
          <p className="text-sm text-text-secondary mt-1">
            Calendarios de contenido por cliente o marca, con avisos de grabación por WhatsApp.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="shrink-0 min-h-11 flex items-center gap-2 bg-action-primary text-action-primary-foreground px-4 py-2.5 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={Add01Icon} size={15} color="white" />
          <span className="hidden sm:inline">Nuevo cliente / marca</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {clients === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-surface-sidebar animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border-subtle rounded-surface">
          <div className="w-14 h-14 rounded-surface bg-nav-active flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={MegaphoneIcon} size={24} color="#3545D6" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-1">Sin clientes ni marcas todavía</h2>
          <p className="text-sm text-text-secondary mb-5 max-w-sm mx-auto">
            Crea tu primer cliente o marca para armar su calendario de contenido y avisarle cuándo grabar.
          </p>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex min-h-11 items-center gap-2 bg-action-primary text-action-primary-foreground px-5 py-2.5 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} color="white" />
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="group relative bg-white border border-border-subtle rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white"
                  style={{ backgroundColor: c.kind === "cliente" ? "#3545D6" : "#5363EE" }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">{c.name}</h3>
                  <p className="text-xs text-text-secondary truncate">
                    {c.kind === "cliente" ? "Cliente" : "Marca propia"}
                    {c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-secondary mb-4">
                <span>{c._count?.items ?? 0} piezas</span>
                <span>·</span>
                <span>{c._count?.phones ?? 0} números WhatsApp</span>
                {c.context && (
                  <>
                    <span>·</span>
                    <span className="text-action-primary font-semibold">Con contexto IA</span>
                  </>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2">
                <Link
                  href={`/contenido/${c.id}`}
                  className="flex-1 min-h-10 flex items-center justify-center gap-2 py-2 text-sm rounded-control bg-nav-active text-action-primary font-semibold hover:bg-nav-hover transition-colors duration-200 motion-reduce:transition-none"
                >
                  <HugeiconsIcon icon={Calendar01Icon} size={14} color="#3545D6" />
                  Ver calendario
                </Link>
                <button
                  onClick={() => { setEditing(c); setModalOpen(true); }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-sidebar transition-colors"
                  title="Editar"
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  <HugeiconsIcon icon={Delete01Icon} size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientModal initial={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setDeleting(null)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative bg-white rounded-surface border border-border-subtle p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar &quot;{deleting.name}&quot;?</p>
            <p className="text-xs text-text-secondary mb-5">
              Se eliminarán también su calendario, sus piezas y sus números de WhatsApp. El enlace público dejará de funcionar.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">
                Cancelar
              </button>
              <button
                onClick={doDelete}
                disabled={deleteBusy}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                {deleteBusy ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
