import { Suspense } from "react";
import ProjectRegistrosPage from "./ProjectRegistrosClient";

export default function ProjectRegistrosRoute() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" /></div>}>
      <ProjectRegistrosPage />
    </Suspense>
  );
}
