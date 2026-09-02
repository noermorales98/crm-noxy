"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";
import KbMarkdown from "@/src/components/kb/KbMarkdown";

type DocRef = {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
};

type DocRelation = { id: string; page: DocRef };

type PageDetail = {
  id: string;
  title: string;
  content: string;
  isFolder: boolean;
  markdownTheme: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  children: DocRef[];
};

export default function PublicProjectDocsView({
  token,
  pageId,
}: {
  token: string;
  pageId?: string;
}) {
  const [relations, setRelations] = useState<DocRelation[]>([]);
  const [page, setPage] = useState<PageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        if (pageId) {
          const res = await fetch(`/api/public/projects/${token}/docs/${pageId}`);
          if (!res.ok) throw new Error("not found");
          const data = await res.json();
          if (!cancelled) setPage(data);
        } else {
          const res = await fetch(`/api/public/projects/${token}/docs`);
          if (!res.ok) throw new Error("not found");
          const data = await res.json();
          if (!cancelled) {
            setRelations(data);
            setPage(null);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-text-secondary text-center py-16">No se pudo cargar este documento.</p>;
  }

  if (page) {
    return (
      <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-4">
        <Link
          href={`/proyecto/${token}/docs`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary self-start"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Todos los docs
        </Link>
        <div className="flex items-center gap-2">
          <PageIcon emoji={page.emoji} iconColor={page.iconColor} iconBg={page.iconBg} isFolder={page.isFolder} size={18} />
          <h2 className="text-lg font-bold text-text-primary">{page.title}</h2>
        </div>
        {page.isFolder ? (
          page.children.length === 0 ? (
            <p className="text-sm text-text-secondary">Esta carpeta está vacía.</p>
          ) : (
            <ul className="bg-white rounded-lg border border-border-subtle divide-y divide-gray-50 overflow-hidden">
              {page.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/proyecto/${token}/docs/${child.id}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-nav-hover"
                  >
                    <PageIcon emoji={child.emoji} iconColor={child.iconColor} iconBg={child.iconBg} isFolder={child.isFolder} size={15} />
                    <span className="truncate">{child.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="bg-white rounded-lg border border-border-subtle p-6">
            {page.content ? (
              <KbMarkdown content={page.content} theme={page.markdownTheme} />
            ) : (
              <p className="text-sm text-text-secondary">Este documento está vacío.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6">
      {relations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-border-subtle">
          <HugeiconsIcon icon={Folder01Icon} size={40} color="#d1d5db" className="mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Sin documentos vinculados.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-lg border border-border-subtle divide-y divide-gray-50 overflow-hidden">
          {relations.map((r) => (
            <li key={r.id}>
              <Link
                href={`/proyecto/${token}/docs/${r.page.id}`}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                <PageIcon emoji={r.page.emoji} iconColor={r.page.iconColor} iconBg={r.page.iconBg} isFolder={r.page.isFolder} size={15} />
                <span className="truncate">{r.page.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
