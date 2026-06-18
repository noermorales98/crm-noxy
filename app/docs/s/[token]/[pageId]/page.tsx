"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import KbPublicViewer, { type PublicTreeNode } from "@/src/components/kb/KbPublicViewer";
import type { KbShareRole } from "@prisma/client";

export default function PublicSharePageView() {
  const params = useParams();
  const token = params?.token as string;
  const pageId = params?.pageId as string;
  const [shareMeta, setShareMeta] = useState<{
    role: KbShareRole;
    page: { id: string; title: string; isFolder: boolean };
    tree: PublicTreeNode[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/kb/share/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "Enlace no válido");
        }
        return r.json();
      })
      .then((data) =>
        setShareMeta({
          role: data.role,
          page: data.page,
          tree: data.tree ?? [],
        })
      )
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!shareMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border-subtle border-t-text-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <KbPublicViewer token={token} pageId={pageId} shareMeta={shareMeta} />;
}
