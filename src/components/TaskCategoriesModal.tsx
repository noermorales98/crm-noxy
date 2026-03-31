"use client";
import { useState, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";

export default function TaskCategoriesModal({
  isOpen,
  onClose,
  onCategoriesChange
}: {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange: () => void;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [companyId, setCompanyId] = useState("");
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchCompanies();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/task-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        setCompanies(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/task-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, companyId })
      });

      if (res.ok) {
        setName("");
        setCompanyId("");
        setColor("#3B82F6");
        fetchCategories();
        onCategoriesChange(); // Notify parent
        addToast("Categoría creada", "success");
      } else {
        addToast("Error al crear categoría", "error");
      }
    } catch (e) {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    const ok = await confirm({
      title: "Eliminar Categoría",
      description: `¿Estás seguro de eliminar la categoría '${cat.name}'? Las tareas en esta categoría quedarán sin categorizar.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger"
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/task-categories/${cat.id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        onCategoriesChange();
        addToast("Categoría eliminada", "success");
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch (e) {
      addToast("Error de conexión", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Categorías de Tareas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Create Form */}
          <form onSubmit={handleCreate} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-gray-700">Nueva Categoría</h4>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                required
                type="text"
                placeholder="Nombre de categoría"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-black"
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-[38px] p-1 rounded-lg border border-gray-200 cursor-pointer"
                title="Color de la etiqueta"
              />
            </div>
            <div>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-black bg-white"
              >
                <option value="">-- Sin Empresa (Global) --</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              <Plus size={16} /> Agregar
            </button>
          </form>

          {/* List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Tus Categorías</h4>
            {loading ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-400">No hay categorías. Crea una usando el formulario superior.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {categories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#3B82F6' }} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        {c.company && (
                          <span className="text-xs text-gray-500">🏢 {c.company.name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
