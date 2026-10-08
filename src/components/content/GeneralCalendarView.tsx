"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon, ArrowRight01Icon, RefreshIcon, User02Icon,
} from "@hugeicons/core-free-icons";
import {
  CALENDAR_CSS, CALENDAR_FONTS, ContentMonthGrid, ContentItemModal, CalendarFilterBar,
  monthLabel, type ContentItemData,
} from "./ContentCalendar";
import { matchesPublishFilter, type PublishListFilter } from "@/src/lib/content-publish";
import { formatMesParam, isCurrentMonth, parseMesParam, shiftMonth } from "@/src/lib/content-month";
import { ContentItemEditor } from "./ContentCalendarView";
import { useHeader } from "@/src/context/HeaderContext";

type ClientOption = {
  id: string;
  name: string;
  kind: string;
  color: string;
  reminderHour: number;
  reminderMinute: number;
  reminderDaysBefore: number;
};

type ApiItem = ContentItemData & {
  client?: { id: string; name: string; kind: string; color: string };
};

type GoogleStatus = { connected: boolean; pending: number };

function toGridItem(item: ApiItem): ContentItemData {
  return {
    ...item,
    clientId: item.client?.id ?? item.clientId,
    clientName: item.client?.name ?? item.clientName,
    clientColor: item.client?.color ?? item.clientColor,
  };
}

export default function GeneralCalendarView() {
  const { setConfig } = useHeader();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = new Date();
  const parsedMonth = parseMesParam(searchParams.get("mes"));
  const cursor = parsedMonth ?? { year: now.getFullYear(), month: now.getMonth() };
  const [items, setItems] = useState<ContentItemData[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PublishListFilter>("todas");

  const [selected, setSelected] = useState<ContentItemData | null>(null);
  const [editing, setEditing] = useState<ContentItemData | null>(null);
  const [newForDate, setNewForDate] = useState<string | null>(null);
  const [createClientId, setCreateClientId] = useState<string | null>(null);
  const [pickingClientFor, setPickingClientFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ContentItemData | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const loadItems = useCallback(() => {
    setLoading(true);
    fetch(`/api/content/items?month=${monthParam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiItem[]) => setItems(Array.isArray(data) ? data.map(toGridItem) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [monthParam]);

  const loadClients = useCallback(() => {
    fetch("/api/content/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) {
          setClients([]);
          return;
        }
        setClients(data.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          color: c.color || "#3545D6",
          reminderHour: c.reminderHour ?? 8,
          reminderMinute: c.reminderMinute ?? 0,
          reminderDaysBefore: c.reminderDaysBefore ?? 1,
        })));
      })
      .catch(() => setClients([]));
  }, []);

  const loadGoogle = useCallback(() => {
    fetch("/api/content/google-sync")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.connected === "boolean") {
          setGoogle({ connected: data.connected, pending: data.pending ?? 0 });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(loadItems, [loadItems]);
  useEffect(loadClients, []);
  useEffect(loadGoogle, []);

  const patchEditorNote = async (itemId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/content/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo guardar la nota");
    const editorNote = data.editorNote ?? null;
    const editorNotes = Array.isArray(data.editorNotes) ? data.editorNotes : [];
    setSelected((current) => (current && current.id === itemId ? { ...current, editorNote, editorNotes } : current));
    setItems((list) => list.map((it) => (it.id === itemId ? { ...it, editorNote, editorNotes } : it)));
  };

  const visibleItems = useMemo(
    () => items.filter((item) => {
      if (filterId && item.clientId !== filterId) return false;
      return matchesPublishFilter(item.publishStatus, statusFilter);
    }),
    [items, filterId, statusFilter],
  );

  const writeMonth = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isCurrentMonth(year, month)) params.delete("mes");
    else params.set("mes", formatMesParam(year, month));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const moveMonth = (delta: number) => {
    const next = shiftMonth(cursor.year, cursor.month, delta);
    writeMonth(next.year, next.month);
  };

  const goToday = () => {
    const today = new Date();
    writeMonth(today.getFullYear(), today.getMonth());
  };

  const startCreate = (dateStr: string) => {
    const clientId = filterId ?? (clients.length === 1 ? clients[0].id : null);
    if (!clientId) {
      setPickingClientFor(dateStr);
      return;
    }
    setCreateClientId(clientId);
    setNewForDate(dateStr);
  };

  const editorClientId = editing?.clientId ?? createClientId;
  const editorClient = clients.find((c) => c.id === editorClientId) ?? null;

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    await fetch(`/api/content/items/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    setDeleting(null);
    setSelected(null);
    loadItems();
    loadGoogle();
  };

  const syncGoogle = async () => {
    setSyncBusy(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/content/google-sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo sincronizar");
      if (!data.connected) {
        setSyncResult("Google Calendar no está conectado.");
      } else if (data.synced === 0 && data.failed === 0) {
        setSyncResult("No hay piezas pendientes de sincronizar.");
      } else if (data.failed) {
        setSyncResult(`${data.synced} sincronizadas, ${data.failed} no se pudieron enviar.`);
      } else {
        setSyncResult(`${data.synced} ${data.synced === 1 ? "pieza sincronizada" : "piezas sincronizadas"} con Google Calendar.`);
      }
      loadGoogle();
    } catch (e: unknown) {
      setSyncResult(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally {
      setSyncBusy(false);
    }
  };

  const syncRef = useRef(syncGoogle);
  const createRef = useRef(startCreate);
  const moveRef = useRef(moveMonth);
  const todayRef = useRef(goToday);
  syncRef.current = syncGoogle;
  createRef.current = startCreate;
  moveRef.current = moveMonth;
  todayRef.current = goToday;

  useEffect(() => {
    const label = monthLabel(cursor.year, cursor.month);
    const navBtn = "flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary";
    setConfig({
      title: (
        <div className="flex min-w-0 items-center gap-0.5">
          <button type="button" className={navBtn} aria-label="Mes anterior" onClick={() => moveRef.current(-1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>
          <span className="truncate px-1 text-base font-bold capitalize text-text-primary sm:text-lg">{label}</span>
          <button type="button" className={navBtn} aria-label="Mes siguiente" onClick={() => moveRef.current(1)}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
          <button type="button" className="min-h-11 px-2 text-sm font-semibold text-text-primary" onClick={() => todayRef.current()}>
            Hoy
          </button>
        </div>
      ),
      addButton: {
        label: "Agregar pieza",
        hideOnMobile: true,
        onClick: () => createRef.current(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`),
      },
      actions: [
        {
          key: "clients",
          icon: User02Icon,
          label: "Ver clientes",
          href: "/contenido",
          hideOnMobile: true,
        },
        {
          key: "sync",
          icon: RefreshIcon,
          label: syncBusy
            ? "Sincronizando…"
            : google?.pending
              ? `Sincronizar con Google (${google.pending})`
              : "Sincronizar con Google",
          onClick: () => syncRef.current(),
          disabled: syncBusy || google?.connected === false,
          spinning: syncBusy,
          hideOnMobile: true,
        },
      ],
    });
    return () => setConfig({});
  }, [cursor.year, cursor.month, google?.connected, google?.pending, setConfig, syncBusy]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-app pb-24 lg:pb-0">
      {CALENDAR_FONTS}
      <style>{CALENDAR_CSS}</style>

      <div className="ncc-root ncc-root-fit flex min-h-0 w-full flex-1 flex-col px-3 py-2 sm:px-4">
        {google && !google.connected && (
          <p className="mb-1 shrink-0 text-xs text-text-secondary" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
            Conecta Google Calendar en{" "}
            <Link href="/settings" className="font-semibold text-action-primary hover:underline">Ajustes</Link>
            {" "}para reflejar las piezas en tu calendario.
          </p>
        )}
        {syncResult && (
          <p className="mb-1 shrink-0 text-xs text-text-secondary" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>{syncResult}</p>
        )}

        {loading ? (
          <div className="min-h-0 flex-1 rounded-surface bg-surface-sidebar animate-pulse" />
        ) : clients.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-surface border border-dashed border-border-subtle bg-white text-center">
            <p className="mb-3 text-sm text-text-secondary">Crea un cliente o marca para armar el calendario.</p>
            <Link href="/contenido?new=1" className="text-sm font-semibold text-action-primary hover:underline">
              Nuevo cliente / marca
            </Link>
          </div>
        ) : (
          <>
            <CalendarFilterBar
              status={statusFilter}
              onStatus={setStatusFilter}
              clients={clients}
              clientId={filterId}
              onClient={setFilterId}
            />
            <div className="min-h-0 flex-1">
              <ContentMonthGrid
                year={cursor.year}
                month={cursor.month}
                items={visibleItems}
                editable
                fill
                onItemClick={setSelected}
                onDayClick={startCreate}
              />
            </div>
          </>
        )}

        {clients.length > 0 && (
          <div className="mt-2 hidden shrink-0 gap-1.5 overflow-x-auto pb-1 sm:flex" style={{ fontFamily: '"Open Sauce Two",system-ui,sans-serif' }}>
            <button
              type="button"
              aria-pressed={filterId === null}
              onClick={() => setFilterId(null)}
              className={`inline-flex min-h-8 shrink-0 items-center rounded-full border-0 px-3 text-[13px] ${filterId === null ? "bg-white font-semibold text-[#0B0B18] shadow-[0_1px_3px_rgba(11,11,24,0.12)]" : "bg-transparent font-medium text-[#6B7184] hover:text-[#0B0B18]"}`}
            >
              Todos
            </button>
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                aria-pressed={filterId === client.id}
                onClick={() => setFilterId((current) => (current === client.id ? null : client.id))}
                className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border-0 px-3 text-[13px] ${filterId === client.id ? "bg-white font-semibold text-[#0B0B18] shadow-[0_1px_3px_rgba(11,11,24,0.12)]" : "bg-transparent font-medium text-[#6B7184] hover:text-[#0B0B18]"}`}
              >
                <i className="inline-block w-2 h-2 rounded-full" style={{ background: client.color }} />
                {client.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ContentItemModal
          item={selected}
          onClose={() => setSelected(null)}
          showReminder
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDelete={() => setDeleting(selected)}
          onSavePublishStatus={async (status) => {
            const res = await fetch(`/api/content/items/${selected.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publishStatus: status }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo guardar el estado");
            const next = {
              publishStatus: data.publishStatus ?? status,
              uploadedAt: data.uploadedAt ?? null,
            };
            setSelected((current) => (current && current.id === selected.id ? { ...current, ...next } : current));
            setItems((list) => list.map((it) => (it.id === selected.id ? { ...it, ...next } : it)));
          }}
          onSaveEditorNote={(note) => patchEditorNote(selected.id, { editorNote: note })}
          onUpdateEditorNote={(noteId, note) => patchEditorNote(selected.id, { updateEditorNoteId: noteId, editorNote: note })}
          onDeleteEditorNote={(noteId) => patchEditorNote(selected.id, { deleteEditorNoteId: noteId })}
        />
      )}

      {editorClient && (editing || newForDate) && (
        <ContentItemEditor
          clientId={editorClient.id}
          clientName={editorClient.name}
          initial={editing}
          defaultDate={newForDate ?? ""}
          defaultDaysBefore={editorClient.reminderDaysBefore}
          sendHour={editorClient.reminderHour}
          sendMinute={editorClient.reminderMinute}
          onClose={() => { setEditing(null); setNewForDate(null); setCreateClientId(null); }}
          onSaved={() => { loadItems(); loadGoogle(); }}
        />
      )}

      {pickingClientFor && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setPickingClientFor(null)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-surface sm:rounded-surface border border-border-subtle p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-text-primary mb-1">¿Para qué cliente?</h2>
            <p className="text-sm text-text-secondary mb-4">La pieza se agrega al calendario de ese cliente.</p>
            <div className="flex flex-col gap-2">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    setCreateClientId(client.id);
                    setNewForDate(pickingClientFor);
                    setPickingClientFor(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-control border border-border-subtle hover:bg-surface-sidebar text-left"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: client.color }} />
                  <span className="text-sm font-medium text-text-primary">{client.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" onClick={() => setDeleting(null)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative bg-white rounded-surface border border-border-subtle p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar &quot;{deleting.title}&quot;?</p>
            <p className="text-xs text-text-secondary mb-5">Se quita del calendario del cliente y de Google Calendar, si estaba sincronizada.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2 text-sm rounded-lg hover:bg-surface-sidebar transition-colors">Cancelar</button>
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
