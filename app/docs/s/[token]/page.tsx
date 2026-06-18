"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";
import KbPublicViewer, { type PublicTreeNode } from "@/src/components/kb/KbPublicViewer";
import type { KbShareRole } from "@prisma/client";

type ShareMeta = {
  role: KbShareRole;
  page: { id: string; title: string; isFolder: boolean };
  includeChildren: boolean;
  tree: PublicTreeNode[];
};

function FolderLanding({ token, meta }: { token: string; meta: ShareMeta }) {
  const firstPage = findFirstPage(meta.tree);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">{meta.page.title}</h1>
        <p className="text-sm text-text-secondary mb-6">Elige un documento</p>
        {meta.tree.length === 0 ? (
          <p className="text-sm text-text-secondary italic">Esta carpeta está vacía</p>
        ) : (
          <div className="space-y-1">
            {meta.tree.map((node) => (
              <Link
                key={node.id}
                href={`/docs/s/${token}/${node.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors"
              >
                <PageIcon
                  emoji={node.emoji}
                  iconColor={node.iconColor}
                  iconBg={node.iconBg}
                  isFolder={node.isFolder}
                  size={18}
                  block
                />
                <span className="flex-1 text-sm font-medium">{node.title || "Sin título"}</span>
                <ChevronRight size={14} className="text-text-secondary" />
              </Link>
            ))}
          </div>
        )}
        {firstPage && (
          <Link
            href={`/docs/s/${token}/${firstPage.id}`}
            className="inline-block mt-6 text-sm font-medium underline"
          >
            Abrir primer documento
          </Link>
        )}
      </div>
    </div>
  );
}

function findFirstPage(nodes: PublicTreeNode[]): PublicTreeNode | null {
  for (const n of nodes) {
    if (!n.isFolder) return n;
    const child = findFirstPage(n.children);
    if (child) return child;
  }
  return null;
}

export default function PublicShareRootPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/kb/share/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "Enlace no válido");
        }
        return r.json();
      })
      .then((data: ShareMeta) => {
        setMeta(data);
        if (!data.page.isFolder) {
          router.replace(`/docs/s/${token}/${data.page.id}`);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border-subtle border-t-text-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-red-600">{error || "Enlace no disponible"}</p>
      </div>
    );
  }

  return <FolderLanding token={token} meta={meta} />;
}
