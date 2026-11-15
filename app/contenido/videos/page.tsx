"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
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
type StoredVideo = { id: string; title: string; platform: string; publishedAt: string | null; reach: number | null; views: number | null; engagementPct: number | null; hookType: string | null };
type ImportResult = { total?: number; valid?: number; sample?: Record<string, string>[]; created?: number; skipped?: number; error?: string };

const DEFAULT_MAPPING = {
  title: "Título", platform: "Plataforma", publishedAt: "Fecha", reach: "Alcance",
  views: "Vistas", shares: "Compartidos", saves: "Guardados",
};
const number = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("es-MX").format(value);
const hour = (value: number | null) => value == null ? "—" : `${String(value).padStart(2, "0")}:00 UTC`;

function VideoTable({ title, rows, empty }: { title: string; rows: VideoRow[]; empty: string }) {
  const columns = [
    { key: "title", header: "Video", render: (row: VideoRow) => <span className="block max-w-[24rem] truncate font-semibold text-text-primary" title={row.title}>{row.title}</span> },
    { key: "engagement", header: "Interacción", align: "right" as const, render: (row: VideoRow) => <span className="font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span> },
    { key: "hook", header: "Hook", render: (row: VideoRow) => row.hookType ? <Chip>{row.hookType}</Chip> : <span className="text-text-secondary">—</span> },
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
      empty={<EmptyState title={empty} body="Importa un CSV de Metricool para empezar a comparar resultados." />}
    />
  </section>;
}

function AllVideosTable({ rows, onImport }: { rows: StoredVideo[]; onImport: () => void }) {
  const columns = [
    { key: "title", header: "Video", render: (row: StoredVideo) => <span className="block max-w-[25rem] truncate font-semibold text-text-primary" title={row.title}>{row.title}</span> },
    { key: "platform", header: "Plataforma", render: (row: StoredVideo) => <Chip>{row.platform}</Chip> },
    { key: "date", header: "Publicado", render: (row: StoredVideo) => <span className="whitespace-nowrap text-text-secondary">{row.publishedAt ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(row.publishedAt)) : "—"}</span> },
    { key: "reach", header: "Alcance", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums text-text-secondary">{number(row.reach)}</span> },
    { key: "views", header: "Vistas", align: "right" as const, render: (row: StoredVideo) => <span className="tabular-nums text-text-secondary">{number(row.views)}</span> },
    { key: "engagement", header: "Interacción", align: "right" as const, render: (row: StoredVideo) => <span className="font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span> },
    { key: "hook", header: "Hook", render: (row: StoredVideo) => <span className="text-text-secondary">{row.hookType || "—"}</span> },
  ];
  return <section className="mb-5 overflow-hidden rounded-surface border border-line bg-surface-elevated"><header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-5"><h2 className="text-base font-semibold text-text-primary">Videos registrados</h2><Chip>{rows.length}</Chip></header><DataTable label="Videos registrados" rows={rows} columns={columns} getKey={row => row.id}
    mobileRow={row => <div className="min-w-0 flex-1 py-2"><div className="flex justify-between gap-3"><p className="min-w-0 truncate font-semibold text-text-primary">{row.title}</p><span className="shrink-0 font-semibold tabular-nums text-text-primary">{row.engagementPct == null ? "—" : `${row.engagementPct.toFixed(2)} %`}</span></div><p className="mt-1 truncate text-xs text-text-secondary">{row.platform} · {number(row.views)} vistas · {row.hookType || "Sin hook"}</p></div>}
    empty={<EmptyState title="Aún no hay videos registrados" body="Importa un CSV de Metricool para ver tus resultados y descubrir patrones." action={<button type="button" onClick={onImport} className="crm-press min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground">Importar CSV</button>} />}
  /></section>;
}

export default function VideosPage() {
  const { setConfig } = useHeader();
  const [weeks, setWeeks] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState(JSON.stringify(DEFAULT_MAPPING, null, 2));
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, showImport, () => setShowImport(false));

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [weeklyResponse, videosResponse] = await Promise.all([fetch(`/api/videos/weekly?weeks=${weeks}`), fetch("/api/videos")]);
      if (!weeklyResponse.ok || !videosResponse.ok) throw new Error("No se pudo cargar el reporte");
      const [weekly, allVideos] = await Promise.all([weeklyResponse.json(), videosResponse.json()]);
      setSummary(weekly); setVideos(allVideos);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [weeks]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setConfig({ title: "Videos y viralidad", titleBadge: summary?.total, pageHeader: true }); return () => setConfig({}); }, [setConfig, summary?.total]);

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

  const withKeys = (rows: Summary["best"], group: string): VideoRow[] => rows.map((row, index) => ({ ...row, key: `${group}-${index}` }));
  return <main className="crm-mobile-bottom-clearance min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
    <PageHeader title="Videos y viralidad" subtitle="Compara qué formatos generan más compartidos y guardados por alcance."
      actions={<button type="button" onClick={() => { setResult(null); setShowImport(true); }} className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10">Importar CSV</button>} />
    <FilterBar segments={<Segmented label="Periodo" value={String(weeks)} onChange={value => setWeeks(Number(value))} options={[{ value: "1", label: "7 días" }, { value: "4", label: "4 semanas" }, { value: "12", label: "12 semanas" }]} />} />
    {loading ? <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated"><Skeleton shape="rows" count={5} label="Cargando videos" /></div> : loadError ? <div className="rounded-surface border border-line bg-surface-elevated"><ErrorState title="No se pudo cargar el reporte" onRetry={() => void load()} /></div> : <>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary"><span><strong className="font-semibold tabular-nums text-text-primary">{summary?.total ?? 0}</strong> videos</span><span><strong className="font-semibold tabular-nums text-text-primary">{summary?.ranked ?? 0}</strong> con alcance medido</span></div>
      <AllVideosTable rows={videos} onImport={() => { setResult(null); setShowImport(true); }} />
      <div className="space-y-5"><VideoTable title="Mejor 20 %" rows={withKeys(summary?.best ?? [], "best")} empty="Aún no hay videos destacados" /><VideoTable title="Peor 20 %" rows={withKeys(summary?.worst ?? [], "worst")} empty="Aún no hay videos para comparar" /></div>
      <p className="mt-4 text-xs text-text-secondary">Interacción = (compartidos + guardados) ÷ alcance. Las horas se muestran en UTC.</p>
    </>}
    {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="video-import-title" className="w-full max-w-lg overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 id="video-import-title" className="text-base font-semibold text-text-primary">Importar desde Metricool</h2><p className="mt-0.5 text-sm text-text-secondary">Revisa el archivo antes de guardarlo.</p></div><button type="button" onClick={() => setShowImport(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar lg:size-9"><HugeiconsIcon icon={Cancel01Icon} size={18} /></button></div>
      <div className="space-y-4 px-5 py-5"><label className="block text-sm font-semibold text-text-primary">Archivo CSV<input type="file" accept=".csv,text/csv" className="mt-2 block w-full text-sm text-text-secondary file:mr-3 file:rounded-control file:border file:border-line file:bg-surface-elevated file:px-3 file:py-2 file:text-sm file:font-semibold file:text-text-primary" onChange={async event => { const file = event.target.files?.[0]; setFileName(file?.name ?? ""); setCsv(file ? await file.text() : ""); setResult(null); }} /></label>
        {fileName && <p className="text-xs text-text-secondary">{fileName}</p>}
        <details className="rounded-control border border-line px-3 py-2 text-sm"><summary className="cursor-pointer font-medium text-text-secondary">Ajustar columnas si tu CSV usa otros nombres</summary><label className="mt-3 block text-xs text-text-secondary">Mapeo de columnas (JSON)<textarea value={mapping} onChange={event => setMapping(event.target.value)} rows={6} spellCheck={false} className={`${inputCls} mt-1 font-mono text-xs`} /></label></details>
        {result?.error && <p role="alert" className="text-sm text-danger">{result.error}</p>}
        {result && !result.error && <div role="status" className="rounded-control bg-surface-sidebar px-3 py-3 text-sm text-text-primary">{result.created != null ? `${result.created} videos importados · ${result.skipped ?? 0} omitidos` : `${result.valid ?? 0} de ${result.total ?? 0} filas listas para importar`}{result.sample && result.sample.length > 0 && <p className="mt-1 truncate text-xs text-text-secondary">Ejemplo: {result.sample[0].title ?? "Sin título"}</p>}</div>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4"><button type="button" onClick={() => setShowImport(false)} className="min-h-11 rounded-control px-4 text-sm font-semibold text-text-secondary hover:bg-surface-sidebar">Cerrar</button><button type="button" disabled={busy || !csv} onClick={() => void importCsv(true)} className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold text-text-primary disabled:opacity-50">Vista previa</button><button type="button" disabled={busy || !csv || !result?.valid} onClick={() => void importCsv(false)} className="min-h-11 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground disabled:opacity-50">{busy ? "Procesando…" : "Importar"}</button></div>
    </div></div>}
  </main>;
}
