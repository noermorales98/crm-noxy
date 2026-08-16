"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useHeader } from "@/src/context/HeaderContext";
import { PencilEdit01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

interface WelcomeHeaderTitleProps {
  editMode?: boolean;
  onToggleEditMode?: () => void;
}

export function WelcomeHeaderTitle({ editMode = false, onToggleEditMode }: WelcomeHeaderTitleProps) {
  const { data: session } = useSession();
  const { setConfig, resetState } = useHeader();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: (
        <span className="flex items-center gap-2">
          <span className="max-sm:hidden">Bienvenido,</span>
          <img src="/avt.webp" alt="" className="hidden sm:block w-7 h-7 rounded-control object-cover shrink-0" />
          {firstName}
        </span>
      ),
      actions: onToggleEditMode
        ? [
            {
              key: "personalize",
              icon: editMode ? CheckmarkCircle01Icon : PencilEdit01Icon,
              label: editMode ? "Listo" : "Personalizar",
              onClick: onToggleEditMode,
              active: editMode,
            },
          ]
        : undefined,
    });
    return () => setConfig({});
  }, [firstName, editMode, onToggleEditMode]);

  return null;
}
