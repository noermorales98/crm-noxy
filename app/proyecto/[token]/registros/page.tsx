"use client";

import { useParams } from "next/navigation";
import ProjectSubmissionsView from "@/src/components/ProjectSubmissionsView";

export default function PublicProjectRegistrosPage() {
  const { token } = useParams() as { token: string };
  return <ProjectSubmissionsView fetchUrl={`/api/public/projects/${token}/submissions`} />;
}
