"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import ProjectAssociationsEditor from "@/src/components/ProjectAssociationsEditor";

const SECTION_LABELS: { match: (path: string) => boolean; label: string }[] = [
  { match: (p) => p.endsWith("/tareas"), label: "Tareas" },
  { match: (p) => p.endsWith("/docs"), label: "Docs" },
  { match: (p) => p.includes("/registros"), label: "Registrados" },
  { match: (p) => p.endsWith("/correo"), label: "Correo" },
  { match: (p) => p.endsWith("/info"), label: "Info" },
  { match: (p) => p.endsWith("/actividad"), label: "Actividad" },
];

interface ProjectHeaderSetterProps {
  projectId: string;
  projectName: string;
  initial: {
    companyId: string | null;
    contactId: string | null;
    clientId: string | null;
    emailAccountCompanyId: string | null;
  };
}

export function ProjectHeaderSetter({ projectId, projectName, initial }: ProjectHeaderSetterProps) {
  const { setConfig, resetState } = useHeader();
  const pathname = usePathname();
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const section = SECTION_LABELS.find((s) => s.match(pathname ?? ""));
    setConfig({
      title: section ? `${projectName} · ${section.label}` : projectName,
      backHref: "/projects",
      actions: [
        {
          key: "edit-associations",
          icon: PencilEdit01Icon,
          label: "Editar asociaciones",
          onClick: () => setEditorOpen(true),
        },
      ],
    });
    return () => setConfig({});
  }, [projectName, pathname, setConfig]);

  return (
    <ProjectAssociationsEditor projectId={projectId} initial={initial} open={editorOpen} onOpenChange={setEditorOpen} />
  );
}
