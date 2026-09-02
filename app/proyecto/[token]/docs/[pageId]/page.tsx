"use client";

import { useParams } from "next/navigation";
import PublicProjectDocsView from "@/src/components/PublicProjectDocsView";

export default function PublicProjectDocPage() {
  const { token, pageId } = useParams() as { token: string; pageId: string };
  return <PublicProjectDocsView token={token} pageId={pageId} />;
}
