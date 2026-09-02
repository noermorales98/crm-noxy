"use client";

import ProjectSubmissionsView from "@/src/components/ProjectSubmissionsView";
import { useParams, useSearchParams } from "next/navigation";

export default function ProjectRegistrosPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const formId = searchParams.get("formId") || undefined;

  return <ProjectSubmissionsView fetchUrl={`/api/projects/${id}/submissions`} initialFormId={formId} />;
}
