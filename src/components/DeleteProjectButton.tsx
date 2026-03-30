"use client";

import { useConfirm } from "@/src/context/ConfirmContext";
import { useToast } from "@/src/context/ToastContext";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the project link
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
      onClick={handleDelete}
      className="absolute top-4 right-4 p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
      title="Eliminar proyecto"
    >
      <Trash2 size={16} />
    </button>
  );
}
