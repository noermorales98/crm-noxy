"use client";

import { useConfirm } from "@/src/context/ConfirmContext";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({
  projectId,
  projectName,
  onDeleted,
}: {
  projectId: string;
  projectName: string;
  /** La lista que pidió los datos en el cliente los quita aquí; `router.refresh()` no la recarga. */
  onDeleted?: () => void;
}) {
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Por si se vuelve a colocar dentro de un enlace: no navegar al borrar.
    const ok = await confirm({
      title: "Eliminar Proyecto",
      description: `¿Estás seguro de que quieres eliminar el proyecto '${projectName}'? Esto no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger"
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Proyecto eliminado", "success");
        onDeleted?.();
        router.refresh(); // Refresh the server component
      } else {
        const data = await res.json();
        addToast(data.error || "Error al eliminar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="crm-press flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger lg:size-10"
      aria-label={`Eliminar proyecto ${projectName}`}
      title="Eliminar proyecto"
    >
      <HugeiconsIcon icon={Delete01Icon} size={16} />
    </button>
  );
}
