"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon, Clock01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";
import { KbItemMenu } from "@/src/components/kb/KbMobileMenus";
import { useOptionalKbContext } from "@/src/context/KbContext";
import { Chip, DataList, EmptyState, Enter, ErrorState, PageHeader, Skeleton, StatStrip } from "@/src/components/ui";

interface KbPage {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  parentId: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: string;
  _count: { children: number; relations: number };
}

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-10";

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function KbHomePage() {
  const router = useRouter();
  const kb = useOptionalKbContext();
  const { setConfig, resetState } = useHeader();
  const [pages, setPages] = useState<KbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setConfig({ title: "Knowledge Base", pageHeader: true });
    return () => resetState();
  }, []); // eslint-disable-line

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/kb?all=true");
      if (res.ok) setPages(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const createPage = async (isFolder = false) => {
    setCreating(true);
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", isFolder }),
    });
    if (res.ok) {
      const page = await res.json();
      await kb?.syncTree({ type: "create", parentId: null });
      if (!isFolder) router.push(`/kb/${page.id}`);
      else fetchPages();
    }
    setCreating(false);
  };

  const rootPages = pages.filter((page) => !page.parentId);
  const docs = pages.filter((p) => !p.isFolder);

  const createActions = (
    <>
      <button type="button" onClick={() => createPage(true)} disabled={creating} className={secondaryAction}>
        <HugeiconsIcon icon={Folder01Icon} size={16} />
        Nueva carpeta
      </button>
      <button type="button" onClick={() => createPage(false)} disabled={creating} className={primaryAction}>
        <HugeiconsIcon icon={Add01Icon} size={16} />
        Nueva página
      </button>
    </>
  );

  const empty = (
    <EmptyState
      title="Tu knowledge base está vacío"
      body="Crea tu primera página para documentar procesos, guías y más."
      action={<div className="flex flex-wrap justify-center gap-2">{createActions}</div>}
    />
  );

  const renderPage = (page: KbPage, withMenu: boolean) => (
    <div className="flex w-full min-w-0 items-center gap-2">
      <Link href={`/kb/${page.id}`} className="group flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary">
        <PageIcon emoji={page.emoji} iconColor={page.iconColor} iconBg={page.iconBg} isFolder={page.isFolder} size={20} block className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary group-hover:underline">{page.title || "Sin título"}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><HugeiconsIcon icon={Clock01Icon} size={12} /> {timeAgo(page.updatedAt)}</span>
            {page._count.children > 0 && (
              <span>
                {page._count.children} {page.isFolder ? "página" : "subpágina"}{page._count.children > 1 ? "s" : ""}
              </span>
            )}
            {!page.isFolder && page._count.relations > 0 && (
              <span>
                {page._count.relations} relación{page._count.relations > 1 ? "es" : ""}
              </span>
            )}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex">
          {page.isFolder ? (
            <Chip>Carpeta</Chip>
          ) : (
            <Chip tone={page.isPublished ? "done" : "neutral"}>{page.isPublished ? "Publicado" : "Borrador"}</Chip>
          )}
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-text-secondary" />
        </span>
      </Link>
      {withMenu && (
        <KbItemMenu id={page.id} title={page.title} parentId={null} isFolder={page.isFolder} onChanged={() => void fetchPages()} />
      )}
    </div>
  );

  return (
    <main className="crm-mobile-bottom-clearance min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader title="Docs" subtitle="Documentación, guías y notas del equipo" actions={createActions} />
      </Enter>

      <Enter index={1}>
        <div className="mb-4 hidden lg:block">
          <StatStrip
            items={[
              { label: "Total", value: docs.length },
              { label: "Publicadas", value: docs.filter((p) => p.isPublished).length },
              { label: "Borradores", value: docs.filter((p) => !p.isPublished).length },
            ]}
          />
        </div>
      </Enter>

      <Enter index={2}>
        <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
          <header className="flex min-h-14 items-center gap-2 border-b border-line px-4 sm:px-5">
            <h2 className="text-base font-semibold text-text-primary">
              <span className="lg:hidden">Inicio Docs</span>
              <span className="hidden lg:inline">Todas las páginas</span>
            </h2>
            <span className="rounded-full bg-surface-sidebar px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">
              <span className="lg:hidden">{rootPages.length}</span>
              <span className="hidden lg:inline">{pages.length}</span>
            </span>
          </header>
          {loading && pages.length === 0 ? (
            <Skeleton shape="rows" count={4} label="Cargando páginas" />
          ) : loadError && pages.length === 0 ? (
            <ErrorState title="No se pudieron cargar las páginas" onRetry={() => void fetchPages()} />
          ) : (
            <>
              {/* Móvil: páginas raíz con su menú de acciones (en escritorio, el árbol de la sidebar). */}
              <div className="lg:hidden">
                <DataList
                  label="Inicio Docs"
                  rows={rootPages}
                  getKey={(p) => p.id}
                  renderRow={(p) => renderPage(p, true)}
                  empty={pages.length > 0 ? <EmptyState title="Inicio Docs está vacío" body="Las páginas existentes están dentro de carpetas." /> : empty}
                />
              </div>
              <div className="hidden lg:block">
                <DataList label="Todas las páginas" rows={pages} getKey={(p) => p.id} renderRow={(p) => renderPage(p, false)} empty={empty} />
              </div>
            </>
          )}
        </section>
      </Enter>
    </main>
  );
}
