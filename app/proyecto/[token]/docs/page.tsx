"use client";

import { useParams } from "next/navigation";
import PublicProjectDocsView from "@/src/components/PublicProjectDocsView";

export default function PublicProjectDocsPage() {
  const { token } = useParams() as { token: string };
  return <PublicProjectDocsView token={token} />;
}
