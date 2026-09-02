"use client";

import { useParams } from "next/navigation";
import PublicProjectTasksView from "@/src/components/PublicProjectTasksView";

export default function PublicProjectTasksPage() {
  const { token } = useParams() as { token: string };
  return <PublicProjectTasksView token={token} />;
}
