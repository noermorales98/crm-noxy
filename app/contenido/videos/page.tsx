"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Cancel01Icon, PencilEdit02Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { useHeader } from "@/src/context/HeaderContext";
import { Chip, DataTable, EmptyState, ErrorState, FilterBar, PageHeader, Segmented, Skeleton, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";

type VideoRow = {
  key: string;
  title: string;
  engagementPct: number | null;
  hookType: string | null;
  format: string | null;
  durationSeconds: number | null;
  hour: number | null;
  predictorScore: number | null;
  views: number | null;
};
type Summary = { total: number; ranked: number; best: Omit<VideoRow, "key">[]; worst: Omit<VideoRow, "key">[] };
type StoredVideo = {
  id: string; title: string; platform: string; publishedAt: string | null;
  reach: number | null; views: number | null; engagementPct: number | null; hookType: string | null;
  hook: string | null; format: string | null; durationSeconds: number | null; aiTool: string | null;
  prompt: string | null; retention3s: number | null; shares: number | null; saves: number | null;
  comments: number | null; leadsGenerated: number | null; predictorScore: number | null; notes: string | null;
  contentClientId: string | null; contentItemId: string | null;
};
type ImportResult = { total?: number; valid?: number; sample?: Record<string, string>[]; created?: number; skipped?: number; error?: string; rows?: Record<string, unknown>[] };
type FormOptions = { clients: { id: string; name: string }[]; items: { id: string; title: string; date: string; type: string; clientId: string }[] };
type CalendarCandidate = { id: string; title: string; date: string; type: string; hook: string | null; client: { name: string } };

const DEFAULT_MAPPING = {
  title: "Título", platform: "Plataforma", publishedAt: "Fecha", reach: "Alcance",
  views: "Vistas", shares: "Compartidos", saves: "Guardados",
};
const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "Otra"];
const number = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("es-MX").format(value);
const hour = (value: number | null) => value == null ? "—" : `${String(value).padStart(2, "0")}:00 UTC`;
const dateOf = (iso: string | null) => iso ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso)) : "—";
const shortDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(iso)) : "—";

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

const fieldCls = "mt-1";
const labelCls = "block text-xs font-medium text-text-secondary";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelCls}>{label}</span><div className={fieldCls}>{children}</div></label>;
}

function VideoTable({ title, rows, empty }: { title: string; rows: VideoRow[]; empty: string }) {
  const columns = [
    { key: "title", header: "Video", render: (row: VideoRow) => <span className="block max-w-[24rem] truncate font-semibold text-text-primary" title={row.title}>{row.title}</span> },
    { key: "engagement", header: "Interacción", align: "right" as const, render: (row: VideoRow) => <span className="font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span> },
    { key: "hook", header: "Hook", render: (row: VideoRow) => <span className="text-text-secondary">{row.hookType || "—"}</span> },
    { key: "format", header: "Formato", render: (row: VideoRow) => <span className="text-text-secondary">{row.format || "—"}</span> },
    { key: "duration", header: "Duración", align: "right" as const, render: (row: VideoRow) => <span className="tabular-nums text-text-secondary">{row.durationSeconds == null ? "—" : `${number(row.durationSeconds)} s`}</span> },
    { key: "hour", header: "Hora", render: (row: VideoRow) => <span className="whitespace-nowrap tabular-nums text-text-secondary">{hour(row.hour)}</span> },
    { key: "predictor", header: "Predictor", align: "right" as const, render: (row: VideoRow) => <span className="tabular-nums text-text-secondary">{number(row.predictorScore)}</span> },
    { key: "views", header: "Vistas", align: "right" as const, render: (row: VideoRow) => <span className="tabular-nums text-text-secondary">{number(row.views)}</span> },
  ];
  return <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-5">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <Chip>{rows.length}</Chip>
    </header>
    <DataTable
      label={title} columns={columns} rows={rows} getKey={row => row.key}
      mobileRow={row => <div className="min-w-0 flex-1 py-2"><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate font-semibold text-text-primary">{row.title}</p><span className="shrink-0 font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span></div><p className="mt-1 text-xs text-text-secondary">{[row.hookType, row.format, row.durationSeconds == null ? null : `${row.durationSeconds} s`, `${number(row.views)} vistas`].filter(Boolean).join(" · ")}</p></div>}
      empty={<EmptyState title={empty} body="Importa un CSV o PDF de Metricool, añade un video manual o tráelo desde el calendario." />}
    />
  </section>;
}

function AllVideosTable({ rows, onImport, onEdit, selectedIds, onToggle, onToggleAll, onClearSelection, onDelete, deleting, confirmingDelete }: {
  rows: StoredVideo[]; onImport: () => void; onEdit: (video: StoredVideo) => void;
  selectedIds: Set<string>; onToggle: (id: string, checked: boolean) => void; onToggleAll: (checked: boolean) => void;
  onClearSelection: () => void; onDelete: () => void; deleting: boolean;
  confirmingDelete: boolean;
}) {
  const columns = [
    { key: "select", header: "", render: (row: StoredVideo) => <input type="checkbox" checked={selectedIds.has(row.id)} onChange={event => onToggle(row.id, event.target.checked)} aria-label={`Seleccionar ${row.title}`} className="size-4 accent-[#3545D6]" /> },
    { key: "title", header: "Video", render: (row: StoredVideo) => <button type="button" onClick={() => onEdit(row)} title="Editar" className="-mx-1 block max-w-[24rem] truncate rounded-control px-1 text-left font-medium text-text-primary hover:bg-nav-hover hover:underline">{row.title}</button> },
    { key: "date", header: "Fecha", render: (row: StoredVideo) => <span className="whitespace-nowrap tabular-nums text-text-secondary">{shortDate(row.publishedAt)}</span> },
    { key: "platform", header: "Plataforma", render: (row: StoredVideo) => <span className="text-text-secondary">{row.platform}</span> },
    { key: "reach", header: "Alcance", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums">{number(row.reach)}</span> },
    { key: "views", header: "Vistas", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums">{number(row.views)}</span> },
    { key: "shares", header: "Comp.", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums">{number(row.shares)}</span> },
    { key: "saves", header: "Guard.", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums">{number(row.saves)}</span> },
    { key: "engagement", header: "Interacción", align: "right" as const, render: (row: StoredVideo) => <span className="font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span> },
    { key: "actions", header: "", align: "right" as const, render: (row: StoredVideo) => <button type="button" onClick={() => onEdit(row)} aria-label={`Editar ${row.title}`} title="Editar" className="inline-flex size-9 items-center justify-center rounded-control text-text-secondary opacity-60 transition-opacity hover:bg-nav-hover hover:text-text-primary hover:opacity-100 focus-visible:opacity-100"><HugeiconsIcon icon={PencilEdit02Icon} size={16} /></button> },
  ];
  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  return <section className="mb-5 overflow-hidden rounded-surface border border-line bg-surface-elevated"><header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line px-4 sm:px-5"><h2 className="text-base font-semibold text-text-primary">Videos registrados</h2>
    {selectedIds.size > 0 ? (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="tabular-nums text-text-secondary">{selectedIds.size} de {rows.length} seleccionados</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary"><input type="checkbox" checked={allSelected} onChange={event => onToggleAll(event.target.checked)} className="size-4 accent-[#3545D6]" />Todos</label>
        <button type="button" onClick={onClearSelection} className="min-h-9 rounded-control px-3 text-xs font-semibold text-text-secondary hover:bg-surface-sidebar">Limpiar</button>
        {confirmingDelete
          ? <button type="button" disabled={deleting} onClick={onDelete} className="crm-press min-h-9 rounded-control bg-danger px-3 text-xs font-semibold text-white disabled:opacity-50">{deleting ? "Eliminando…" : `Confirmar: eliminar ${selectedIds.size}`}</button>
          : <button type="button" onClick={onDelete} className="crm-press min-h-9 rounded-control px-3 text-xs font-semibold text-danger hover:bg-danger-soft">Eliminar</button>}
      </div>
    ) : <Chip>{rows.length}</Chip>}</header><DataTable label="Videos registrados" rows={rows} columns={columns} getKey={row => row.id}
    mobileRow={row => <div className="flex min-w-0 flex-1 items-start gap-3 py-2"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={event => onToggle(row.id, event.target.checked)} aria-label={`Seleccionar ${row.title}`} className="mt-1 size-4 shrink-0 accent-[#3545D6]" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => onEdit(row)} className="min-w-0 truncate text-left font-medium text-text-primary">{row.title}</button><span className="shrink-0 font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span></div><p className="mt-1 truncate text-xs tabular-nums text-text-secondary">{[shortDate(row.publishedAt), row.platform, row.reach != null ? `${number(row.reach)} alcance` : null, row.views != null ? `${number(row.views)} vistas` : null].filter(Boolean).join(" · ")}</p></div></div>}
    empty={<EmptyState title="Aún no hay videos registrados" body="Importa un CSV o PDF de Metricool, añade uno manual o trae las piezas ya programadas del calendario." action={<button type="button" onClick={onImport} className="crm-press min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground">Importar</button>} />}
  /></section>;
}

const EMPTY_FORM = {
  title: "", platform: "TikTok", publishedAt: "", reach: "", views: "", shares: "", saves: "",
  comments: "", retention3s: "", durationSeconds: "", hookType: "", format: "", aiTool: "",
  predictorScore: "", leadsGenerated: "", hook: "", prompt: "", notes: "", contentClientId: "", contentItemId: "",
};

export default function VideosPage() {
  const { setConfig } = useHeader();
  const [weeks, setWeeks] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Diálogo de importación (CSV o PDF)
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [defaultPlatform, setDefaultPlatform] = useState("");
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState(JSON.stringify(DEFAULT_MAPPING, null, 2));
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);
  useDialog(importRef, showImport, () => setShowImport(false));

  // Diálogo de alta/edición manual
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StoredVideo | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [options, setOptions] = useState<FormOptions>({ clients: [], items: [] });
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  useDialog(formRef, showForm, () => setShowForm(false));

  // Diálogo "desde calendario"
  const [showCalendar, setShowCalendar] = useState(false);
  const [candidates, setCandidates] = useState<CalendarCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [calendarBusy, setCalendarBusy] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  useDialog(calendarRef, showCalendar, () => setShowCalendar(false));

  // Selección y borrado de videos
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingSingleDelete, setConfirmingSingleDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [weeklyResponse, videosResponse] = await Promise.all([fetch(`/api/videos/weekly?weeks=${weeks}`), fetch("/api/videos")]);
      if (!weeklyResponse.ok || !videosResponse.ok) throw new Error("No se pudo cargar el reporte");
      const [weekly, allVideos] = await Promise.all([weeklyResponse.json(), videosResponse.json()]);
      setSummary(weekly); setVideos(allVideos);
      setSelectedIds(prev => new Set([...prev].filter(id => allVideos.some((video: StoredVideo) => video.id === id))));
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [weeks]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setConfig({ title: "Videos y viralidad", titleBadge: summary?.total, pageHeader: true }); return () => setConfig({}); }, [setConfig, summary?.total]);

  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  async function importCsv(preview: boolean) {
    if (!csv) { setResult({ error: "Selecciona un archivo CSV." }); return; }
    let parsedMapping: Record<string, string>;
    try { parsedMapping = JSON.parse(mapping); }
    catch { setResult({ error: "El mapeo de columnas no es un JSON válido." }); return; }
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/videos/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, mapping: parsedMapping, preview }),
      });
      const data = await response.json() as ImportResult;
      setResult(data);
      if (response.ok && !preview) { await load(); }
    } catch { setResult({ error: "No se pudo procesar el archivo. Inténtalo de nuevo." }); }
    finally { setBusy(false); }
  }

  async function importPdf(preview: boolean) {
    if (!pdfBase64) { setResult({ error: "Selecciona un archivo PDF." }); return; }
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/videos/import-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: preview
          ? JSON.stringify({ pdfBase64, defaultPlatform })
          : JSON.stringify({ rows: (result?.rows ?? []).map(row => ({ ...row, platform: row.platform || defaultPlatform || "Otra" })) }),
      });
      const data = await response.json() as ImportResult;
      setResult(data);
      if (response.ok && !preview) { await load(); }
    } catch { setResult({ error: "No se pudo procesar el PDF. Inténtalo de nuevo." }); }
    finally { setBusy(false); }
  }

  function openForm(video: StoredVideo | null) {
    setEditing(video);
    setConfirmingSingleDelete(false);
    setForm(video ? {
      title: video.title, platform: video.platform,
      publishedAt: video.publishedAt ? video.publishedAt.slice(0, 10) : "",
      reach: video.reach?.toString() ?? "", views: video.views?.toString() ?? "",
      shares: video.shares?.toString() ?? "", saves: video.saves?.toString() ?? "",
      comments: video.comments?.toString() ?? "", retention3s: video.retention3s?.toString() ?? "",
      durationSeconds: video.durationSeconds?.toString() ?? "", hookType: video.hookType ?? "",
      format: video.format ?? "", aiTool: video.aiTool ?? "", predictorScore: video.predictorScore?.toString() ?? "",
      leadsGenerated: video.leadsGenerated?.toString() ?? "",
      hook: video.hook ?? "", prompt: video.prompt ?? "", notes: video.notes ?? "",
      contentClientId: video.contentClientId ?? "", contentItemId: video.contentItemId ?? "",
    } : EMPTY_FORM);
    setResult(null);
    setShowForm(true);
    if (!options.clients.length) {
      fetch("/api/videos/form-options").then(r => r.ok ? r.json() : null).then(data => { if (data) setOptions(data); }).catch(() => undefined);
    }
  }

  async function saveForm() {
    setSaving(true);
    const body: Record<string, unknown> = { ...form };
    if (!form.contentClientId) body.contentClientId = null;
    if (!form.contentItemId) body.contentItemId = null;
    try {
      const response = await fetch(editing ? `/api/videos/${editing.id}` : "/api/videos", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) { setShowForm(false); await load(); }
      else {
        const data = await response.json().catch(() => ({}));
        setResult({ error: data.error ?? "No se pudo guardar." });
      }
    } catch { setResult({ error: "No se pudo guardar. Inténtalo de nuevo." }); }
    finally { setSaving(false); }
  }

  function toggleSelect(id: string, checked: boolean) {
    setConfirmingDelete(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setConfirmingDelete(false);
    setSelectedIds(checked ? new Set(videos.map(video => video.id)) : new Set());
  }

  function clearSelection() {
    setConfirmingDelete(false);
    setSelectedIds(new Set());
  }

  async function deleteVideos(ids: string[]) {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = ids.length === 1
        ? await fetch(`/api/videos/${ids[0]}`, { method: "DELETE" })
        : await fetch("/api/videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (response.ok) {
        if (editing && ids.includes(editing.id)) setShowForm(false);
        clearSelection();
        setConfirmingSingleDelete(false);
        await load();
      } else {
        setDeleteError("No se pudo eliminar. Inténtalo de nuevo.");
      }
    } catch {
      setDeleteError("No se pudo eliminar. Inténtalo de nuevo.");
    } finally { setDeleting(false); }
  }

  function requestBatchDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    void deleteVideos([...selectedIds]);
  }

  async function openCalendar() {
    setShowCalendar(true);
    setCalendarBusy(true);
    try {
      const response = await fetch("/api/videos/from-calendar");
      if (response.ok) {
        const data = await response.json() as CalendarCandidate[];
        setCandidates(data);
        setSelected(new Set(data.map(c => c.id)));
      }
    } finally { setCalendarBusy(false); }
  }

  async function createFromCalendar() {
    setCalendarBusy(true);
    try {
      const response = await fetch("/api/videos/from-calendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [...selected] }),
      });
      if (response.ok) { setShowCalendar(false); await load(); }
    } finally { setCalendarBusy(false); }
  }

  const setField = (key: keyof typeof EMPTY_FORM) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: event.target.value }));

  const formItems = options.items.filter(item => !form.contentClientId || item.clientId === form.contentClientId);
  const liveEngagement = (() => {
    const reach = Number(form.reach);
    if (!form.reach.trim() || !Number.isFinite(reach) || reach <= 0) return null;
    const shares = Number(form.shares) || 0;
    const saves = Number(form.saves) || 0;
    return 100 * (shares + saves) / reach;
  })();
  const linkedItem = options.items.find(item => item.id === form.contentItemId);
  const linkedClient = options.clients.find(client => client.id === form.contentClientId);

  const withKeys = (rows: Summary["best"], group: string): VideoRow[] => rows.map((row, index) => ({ ...row, key: `${group}-${index}` }));
  return <main className="crm-mobile-bottom-clearance min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
    <PageHeader title="Videos y viralidad" subtitle="Compara qué formatos generan más compartidos y guardados por alcance."
      actions={<div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={openCalendar} className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10"><HugeiconsIcon icon={Calendar01Icon} size={16} />Desde calendario</button>
        <button type="button" onClick={() => openForm(null)} className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10"><HugeiconsIcon icon={PencilEdit02Icon} size={16} />Agregar video</button>
        <button type="button" onClick={() => { setResult(null); setShowImport(true); }} className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"><HugeiconsIcon icon={Upload01Icon} size={16} />Importar</button>
      </div>} />
    <FilterBar segments={<Segmented label="Periodo" value={String(weeks)} onChange={value => setWeeks(Number(value))} options={[{ value: "1", label: "7 días" }, { value: "4", label: "4 semanas" }, { value: "12", label: "12 semanas" }]} />} />
    {loading ? <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated"><Skeleton shape="rows" count={5} label="Cargando videos" /></div> : loadError ? <div className="rounded-surface border border-line bg-surface-elevated"><ErrorState title="No se pudo cargar el reporte" onRetry={() => void load()} /></div> : <>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary"><span><strong className="font-semibold tabular-nums text-text-primary">{summary?.total ?? 0}</strong> videos</span><span><strong className="font-semibold tabular-nums text-text-primary">{summary?.ranked ?? 0}</strong> con alcance medido</span></div>
      {deleteError && <p role="alert" className="mb-3 text-sm text-danger">{deleteError}</p>}
      <AllVideosTable rows={videos} onEdit={openForm} onImport={() => { setResult(null); setShowImport(true); }}
        selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleSelectAll} onClearSelection={clearSelection}
        onDelete={requestBatchDelete} deleting={deleting} confirmingDelete={confirmingDelete} />
      <div className="space-y-5"><VideoTable title="Mejor 20 %" rows={withKeys(summary?.best ?? [], "best")} empty="Aún no hay videos destacados" /><VideoTable title="Peor 20 %" rows={withKeys(summary?.worst ?? [], "worst")} empty="Aún no hay videos para comparar" /></div>
      <p className="mt-4 text-xs text-text-secondary">Interacción = (compartidos + guardados) ÷ alcance. Las horas se muestran en UTC.</p>
    </>}

    {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4"><div ref={importRef} role="dialog" aria-modal="true" aria-labelledby="video-import-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 id="video-import-title" className="text-base font-semibold text-text-primary">Importar desde Metricool</h2><p className="mt-0.5 text-sm text-text-secondary">Acepta CSV o PDF; el PDF lo lee la IA del CRM.</p></div><button type="button" onClick={() => setShowImport(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar lg:size-9"><HugeiconsIcon icon={Cancel01Icon} size={18} /></button></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <label className="block text-sm font-semibold text-text-primary">Archivo CSV o PDF<input type="file" accept=".csv,.pdf,text/csv,application/pdf" className="mt-2 block w-full text-sm text-text-secondary file:mr-3 file:rounded-control file:border file:border-line file:bg-surface-elevated file:px-3 file:py-2 file:text-sm file:font-semibold file:text-text-primary" onChange={async event => {
          const file = event.target.files?.[0];
          setFileName(file?.name ?? ""); setCsv(""); setPdfBase64(""); setResult(null);
          if (!file) return;
          if (file.name.toLowerCase().endsWith(".pdf")) setPdfBase64(await fileToBase64(file));
          else setCsv(await file.text());
        }} /></label>
        {fileName && <p className="text-xs text-text-secondary">{fileName}</p>}
        {isPdf && <Field label="Plataforma por defecto (si el PDF no la indica)">
          <select value={defaultPlatform} onChange={event => setDefaultPlatform(event.target.value)} className={`${inputCls} w-full bg-surface-elevated`}>
            <option value="">Elegir…</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>}
        {!isPdf && fileName && <details className="rounded-control border border-line px-3 py-2 text-sm"><summary className="cursor-pointer font-medium text-text-secondary">Ajustar columnas si tu CSV usa otros nombres</summary><label className="mt-3 block text-xs text-text-secondary">Mapeo de columnas (JSON)<textarea value={mapping} onChange={event => setMapping(event.target.value)} rows={6} spellCheck={false} className={`${inputCls} mt-1 w-full font-mono text-xs`} /></label></details>}
        {result?.error && <p role="alert" className="text-sm text-danger">{result.error}</p>}
        {result && !result.error && <div role="status" className="rounded-control bg-surface-sidebar px-3 py-3 text-sm text-text-primary">
          {result.created != null ? `${result.created} videos importados · ${result.skipped ?? 0} omitidos` : isPdf ? `${result.total ?? 0} videos detectados en el PDF` : `${result.valid ?? 0} de ${result.total ?? 0} filas listas para importar`}
          {result.rows && result.rows.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-text-secondary">{result.rows.slice(0, 5).map((row, index) => <li key={index} className="truncate">· {String(row.title ?? "Sin título")} ({String(row.platform || defaultPlatform || "sin plataforma")})</li>)}</ul>}
          {result.sample && result.sample.length > 0 && <p className="mt-1 truncate text-xs text-text-secondary">Ejemplo: {result.sample[0].title ?? "Sin título"}</p>}
        </div>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4"><button type="button" onClick={() => setShowImport(false)} className="min-h-11 rounded-control px-4 text-sm font-semibold text-text-secondary hover:bg-surface-sidebar">Cerrar</button><button type="button" disabled={busy || (!csv && !pdfBase64)} onClick={() => void (isPdf ? importPdf(true) : importCsv(true))} className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold text-text-primary disabled:opacity-50">{isPdf ? (busy ? "Leyendo…" : "Extraer con IA") : "Vista previa"}</button><button type="button" disabled={busy || (!csv && !pdfBase64) || (!isPdf && !result?.valid) || (isPdf && !(result?.rows?.length))} onClick={() => void (isPdf ? importPdf(false) : importCsv(false))} className="min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-50">{busy ? "Procesando…" : "Importar"}</button></div>
    </div></div>}

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4"><div ref={formRef} role="dialog" aria-modal="true" aria-labelledby="video-form-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 id="video-form-title" className="text-base font-semibold text-text-primary">{editing ? "Editar video" : "Agregar video"}</h2><p className="mt-0.5 text-sm text-text-secondary">Los campos de métricas son opcionales; rellénalos cuando tengas los resultados.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar lg:size-9"><HugeiconsIcon icon={Cancel01Icon} size={18} /></button></div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section>
          <p className="mb-3 text-xs font-semibold text-text-secondary">Video</p>
          <div className="space-y-4">
            <Field label="Título *"><input value={form.title} onChange={setField("title")} className={`${inputCls} w-full`} placeholder="Ej. 3 errores al grabar reels" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plataforma *">
                <select value={form.platform} onChange={setField("platform")} className={`${inputCls} w-full bg-surface-elevated`}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </Field>
              <Field label="Fecha de publicación"><input type="date" value={form.publishedAt} onChange={setField("publishedAt")} className={`${inputCls} w-full`} /></Field>
            </div>
          </div>
        </section>
        <section>
          <p className="mb-3 text-xs font-semibold text-text-secondary">Vínculo al calendario</p>
          <div className="space-y-4">
            <Field label="Cliente / marca de contenido">
              <select value={form.contentClientId} onChange={event => setForm(prev => ({ ...prev, contentClientId: event.target.value, contentItemId: "" }))} className={`${inputCls} w-full bg-surface-elevated`}>
                <option value="">Sin vínculo</option>
                {options.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </Field>
            <Field label="Pieza del calendario">
              <select value={form.contentItemId} onChange={setField("contentItemId")} className={`${inputCls} w-full bg-surface-elevated`}>
                <option value="">Sin vínculo</option>
                {formItems.map(item => <option key={item.id} value={item.id}>{shortDate(item.date)} — {item.title}</option>)}
              </select>
            </Field>
            {linkedItem && <p className="rounded-control bg-surface-sidebar px-3 py-2 text-xs text-text-secondary">Vinculado a: <span className="font-medium text-text-primary">{linkedItem.title}</span>{linkedClient ? ` · ${linkedClient.name}` : ""} · {shortDate(linkedItem.date)}</p>}
          </div>
        </section>
        <section>
          <p className="mb-3 text-xs font-semibold text-text-secondary">Métricas</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Alcance"><input inputMode="numeric" value={form.reach} onChange={setField("reach")} className={`${inputCls} w-full`} /></Field>
            <Field label="Vistas"><input inputMode="numeric" value={form.views} onChange={setField("views")} className={`${inputCls} w-full`} /></Field>
            <Field label="Compartidos"><input inputMode="numeric" value={form.shares} onChange={setField("shares")} className={`${inputCls} w-full`} /></Field>
            <Field label="Guardados"><input inputMode="numeric" value={form.saves} onChange={setField("saves")} className={`${inputCls} w-full`} /></Field>
            <Field label="Comentarios"><input inputMode="numeric" value={form.comments} onChange={setField("comments")} className={`${inputCls} w-full`} /></Field>
            <Field label="Retención 3 s (%)"><input inputMode="decimal" value={form.retention3s} onChange={setField("retention3s")} className={`${inputCls} w-full`} /></Field>
          </div>
          <p aria-live="polite" className="mt-3 text-sm text-text-secondary">Interacción estimada: {liveEngagement == null ? <span>—</span> : <span className="font-semibold tabular-nums text-text-primary">{liveEngagement.toFixed(2)} %</span>} <span className="text-xs">(compartidos + guardados ÷ alcance)</span></p>
        </section>
        <section>
          <p className="mb-3 text-xs font-semibold text-text-secondary">Clasificación</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Tipo de hook"><input value={form.hookType} onChange={setField("hookType")} className={`${inputCls} w-full`} placeholder="Ej. pregunta" /></Field>
            <Field label="Formato"><input value={form.format} onChange={setField("format")} className={`${inputCls} w-full`} placeholder="Ej. talking head" /></Field>
            <Field label="Duración (s)"><input inputMode="numeric" value={form.durationSeconds} onChange={setField("durationSeconds")} className={`${inputCls} w-full`} /></Field>
            <Field label="Herramienta de IA"><input value={form.aiTool} onChange={setField("aiTool")} className={`${inputCls} w-full`} /></Field>
            <Field label="Puntaje predictor"><input inputMode="decimal" value={form.predictorScore} onChange={setField("predictorScore")} className={`${inputCls} w-full`} /></Field>
            <Field label="Leads generados"><input inputMode="numeric" value={form.leadsGenerated} onChange={setField("leadsGenerated")} className={`${inputCls} w-full`} /></Field>
          </div>
        </section>
        <section>
          <p className="mb-3 text-xs font-semibold text-text-secondary">Detalles</p>
          <div className="space-y-4">
            <Field label="Hook"><textarea value={form.hook} onChange={setField("hook")} rows={2} className={`${inputCls} w-full`} /></Field>
            <Field label="Prompt"><textarea value={form.prompt} onChange={setField("prompt")} rows={2} className={`${inputCls} w-full`} /></Field>
            <Field label="Notas"><textarea value={form.notes} onChange={setField("notes")} rows={2} className={`${inputCls} w-full`} /></Field>
          </div>
        </section>
        {result?.error && <p role="alert" className="text-sm text-danger">{result.error}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4">
        <div>{editing && (confirmingSingleDelete
          ? <button type="button" disabled={deleting} onClick={() => void deleteVideos([editing.id])} className="crm-press min-h-11 rounded-control bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50">{deleting ? "Eliminando…" : "Confirmar eliminación"}</button>
          : <button type="button" onClick={() => setConfirmingSingleDelete(true)} className="min-h-11 rounded-control px-4 text-sm font-semibold text-danger hover:bg-danger-soft">Eliminar video</button>)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-control px-4 text-sm font-semibold text-text-secondary hover:bg-surface-sidebar">Cancelar</button><button type="button" disabled={saving || !form.title.trim() || !form.platform.trim()} onClick={() => void saveForm()} className="min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-50">{saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar video"}</button></div>
      </div>
    </div></div>}

    {showCalendar && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4"><div ref={calendarRef} role="dialog" aria-modal="true" aria-labelledby="video-calendar-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 id="video-calendar-title" className="text-base font-semibold text-text-primary">Desde el calendario</h2><p className="mt-0.5 text-sm text-text-secondary">Piezas video/reel programadas en /contenido/general que aún no tienen video registrado.</p></div><button type="button" onClick={() => setShowCalendar(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar lg:size-9"><HugeiconsIcon icon={Cancel01Icon} size={18} /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {calendarBusy && candidates.length === 0 ? <Skeleton shape="rows" count={4} label="Cargando piezas" /> : candidates.length === 0 ? <EmptyState title="Todo el calendario ya está registrado" body="No hay piezas video/reel pendientes de dar de alta." /> : (
          <ul className="divide-y divide-line">
            {candidates.map(item => <li key={item.id}><label className="flex cursor-pointer items-start gap-3 py-2.5">
              <input type="checkbox" checked={selected.has(item.id)} onChange={event => setSelected(prev => { const next = new Set(prev); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} className="mt-1 size-4 accent-[#3545D6]" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{item.title}</span><span className="mt-0.5 block text-xs text-text-secondary">{item.client.name} · {item.type} · {dateOf(item.date)}</span></span>
            </label></li>)}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4">
        <span className="text-sm text-text-secondary">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
        <div className="flex gap-2"><button type="button" onClick={() => setShowCalendar(false)} className="min-h-11 rounded-control px-4 text-sm font-semibold text-text-secondary hover:bg-surface-sidebar">Cerrar</button><button type="button" disabled={calendarBusy || selected.size === 0} onClick={() => void createFromCalendar()} className="min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-50">{calendarBusy ? "Registrando…" : "Registrar videos"}</button></div>
      </div>
    </div></div>}
  </main>;
}
