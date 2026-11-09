"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Calendar01Icon, Delete01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { CLIENT_PALETTE } from "@/src/lib/content-client-colors";
import { Chip, DataTable, EmptyState, Enter, PageHeader, Segmented, Skeleton } from "@/src/components/ui";

type ContentClient = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  context: string | null;
  color: string;
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
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
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
        body: JSON.stringify({ name, kind, description, context, ...(color ? { color } : {}) }),
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
        className="relative w-full sm:max-w-lg rounded-t-surface sm:rounded-surface border border-line bg-surface-elevated p-6 max-h-[92vh] overflow-y-auto"
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
                      : "border-line text-text-secondary hover:bg-surface-sidebar"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="noxy-form-label mb-1">Color en el calendario</label>
            <div className="flex flex-wrap gap-2">
              {CLIENT_PALETTE.map((entry) => {
                const selected = color?.toLowerCase() === entry.hex.toLowerCase();
                return (
                  <button
                    key={entry.hex}
                    type="button"
                    aria-label={`Color ${entry.hex}`}
                    onClick={() => setColor(entry.hex)}
                    className="w-8 h-8 rounded-full border-2"
                    style={{
                      backgroundColor: entry.hex,
                      borderColor: selected ? "#0B0B18" : "transparent",
                    }}
                  />
                );
              })}
            </div>
            {!initial && !color && (
              <p className="text-xs text-text-secondary mt-1">Si no eliges uno, se asigna el siguiente de la paleta.</p>
            )}
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
            <p className="text-xs text-text-secondary mt-1">
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
  // La vista (tarjetas o tabla) se recuerda en este navegador.
  const [view, setView] = useState<"cards" | "table">("cards");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia del navegador: leerla en el servidor desajustaría la hidratación
      if (window.localStorage.getItem("noxy.content.clients.view") === "table") setView("table");
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  const changeView = (next: "cards" | "table") => {
    setView(next);
    try {
      window.localStorage.setItem("noxy.content.clients.view", next);
    } catch {
      /* sin almacenamiento */
    }
  };

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

  const kindLabel = (c: ContentClient) => (c.kind === "cliente" ? "Cliente" : "Marca propia");
  const avatar = (c: ContentClient) => (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
      style={{ backgroundColor: c.color || "#3545D6" }}
    >
      {c.name.charAt(0).toUpperCase()}
    </span>
  );
  const rowActions = (c: ContentClient) => (
    <span className="flex items-center justify-end gap-1">
      <Link
        href={`/contenido/${c.id}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-text-primary hover:bg-nav-hover lg:min-h-9"
      >
        <HugeiconsIcon icon={Calendar01Icon} size={14} aria-hidden="true" />
        Calendario
      </Link>
      <button
        type="button"
        onClick={() => { setEditing(c); setModalOpen(true); }}
        aria-label={`Editar ${c.name}`}
        title="Editar"
        className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary lg:size-9"
      >
        <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
      </button>
      <button
        type="button"
        onClick={() => setDeleting(c)}
        aria-label={`Eliminar ${c.name}`}
        title="Eliminar"
        className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
      >
        <HugeiconsIcon icon={Delete01Icon} size={15} />
      </button>
    </span>
  );
  const columns = [
    {
      key: "name",
      header: "Cliente o marca",
      render: (c: ContentClient) => (
        <Link href={`/contenido/${c.id}`} className="flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
          {avatar(c)}
          <span className="min-w-0">
            <span className="block truncate font-medium text-text-primary">{c.name}</span>
            {c.description && <span className="block max-w-xs truncate text-xs text-text-secondary">{c.description}</span>}
          </span>
        </Link>
      ),
    },
    { key: "kind", header: "Tipo", render: (c: ContentClient) => <Chip>{kindLabel(c)}</Chip> },
    { key: "items", header: "Piezas", align: "right" as const, render: (c: ContentClient) => c._count?.items ?? 0 },
    { key: "phones", header: "WhatsApp", align: "right" as const, render: (c: ContentClient) => c._count?.phones ?? 0 },
    { key: "ai", header: "Contexto IA", render: (c: ContentClient) => (c.context ? <Chip tone="done">Con contexto</Chip> : <span className="text-text-secondary">—</span>) },
    { key: "actions", header: "Acciones", align: "right" as const, render: rowActions },
  ];
  const newButton = (
    <button
      type="button"
      onClick={() => { setEditing(null); setModalOpen(true); }}
      className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"
    >
      <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
      Nuevo cliente / marca
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Clientes de contenido"
          subtitle="Calendarios por cliente o marca, con avisos de grabación por WhatsApp."
          actions={
            <>
              <Segmented
                label="Vista"
                value={view}
                onChange={(next) => changeView(next as "cards" | "table")}
                options={[
                  { value: "cards", label: "Tarjetas" },
                  { value: "table", label: "Tabla" },
                ]}
              />
              {newButton}
            </>
          }
        />
      </Enter>

      {clients === null ? (
        <Skeleton shape="rows" count={4} label="Cargando clientes" />
      ) : clients.length === 0 ? (
        <section className="rounded-surface border border-line bg-surface-elevated">
          <EmptyState title="Sin clientes ni marcas todavía" body="Crea tu primer cliente o marca para armar su calendario de contenido y avisarle cuándo grabar." action={newButton} />
        </section>
      ) : view === "table" ? (
        <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
          <DataTable
            label="Clientes de contenido"
            columns={columns}
            rows={clients}
            getKey={(c: ContentClient) => c.id}
            mobileRow={(c: ContentClient) => (
              <div className="flex w-full min-w-0 items-center gap-3">
                {avatar(c)}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">{c.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{kindLabel(c)} · {c._count?.items ?? 0} piezas</span>
                </span>
                <Link href={`/contenido/${c.id}`} aria-label={`Calendario de ${c.name}`} className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
                  <HugeiconsIcon icon={Calendar01Icon} size={16} />
                </Link>
              </div>
            )}
            empty={null}
          />
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <article key={c.id} className="flex flex-col rounded-surface border border-line bg-surface-elevated p-5">
              <div className="mb-3 flex items-start gap-3">
                {avatar(c)}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-text-primary">{c.name}</h3>
                  <p className="truncate text-xs text-text-secondary">
                    {kindLabel(c)}
                    {c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
              </div>
              <p className="mb-4 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
                <span>{c._count?.items ?? 0} piezas</span>
                <span aria-hidden="true">·</span>
                <span>{c._count?.phones ?? 0} números WhatsApp</span>
                {c.context && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-action-primary">Con contexto IA</span>
                  </>
                )}
              </p>
              <div className="mt-auto">{rowActions(c)}</div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientModal initial={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setDeleting(null)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative bg-surface-elevated rounded-surface border border-line p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar &quot;{deleting.name}&quot;?</p>
            <p className="text-xs text-text-secondary mb-5">
              Se eliminarán también su calendario, sus piezas, sus eventos en Google Calendar y sus números de WhatsApp. El enlace público dejará de funcionar.
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
