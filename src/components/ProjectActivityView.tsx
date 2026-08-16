"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Note01Icon,
  Flag01Icon,
  Idea01Icon,
  StarIcon,
  Alert01Icon,
  Call02Icon,
  Calendar01Icon,
  Mail01Icon,
  FireIcon,
  Target01Icon,
  FolderIcon,
  Task01Icon,
  CheckmarkCircle01Icon,
  PencilEdit01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import DatePicker from "@/src/components/DatePicker";

type ActivityType = "NOTE" | "PROJECT_CREATED" | "TASK_CREATED" | "TASK_COMPLETED" | "ASSOCIATIONS_UPDATED";

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  createdAt: string;
  icon: string | null;
  tags: string[] | null;
  eventDate: string | null;
  createdBy: { name: string | null } | null;
}

const NOTE_ICONS: { key: string; icon: any }[] = [
  { key: "note", icon: Note01Icon },
  { key: "flag", icon: Flag01Icon },
  { key: "idea", icon: Idea01Icon },
  { key: "star", icon: StarIcon },
  { key: "alert", icon: Alert01Icon },
  { key: "call", icon: Call02Icon },
  { key: "calendar", icon: Calendar01Icon },
  { key: "mail", icon: Mail01Icon },
  { key: "fire", icon: FireIcon },
  { key: "target", icon: Target01Icon },
];

function noteIconFor(key: string | null) {
  return NOTE_ICONS.find((i) => i.key === key)?.icon ?? Note01Icon;
}

const TYPE_META: Record<ActivityType, { icon: any; color: string; bg: string }> = {
  NOTE: { icon: Note01Icon, color: "#9065B0", bg: "#F0E6F9" },
  PROJECT_CREATED: { icon: FolderIcon, color: "#3545D6", bg: "#EBEDFA" },
  TASK_CREATED: { icon: Task01Icon, color: "#D9730D", bg: "#FFECD2" },
  TASK_COMPLETED: { icon: CheckmarkCircle01Icon, color: "#448361", bg: "#E2F6E9" },
  ASSOCIATIONS_UPDATED: { icon: PencilEdit01Icon, color: "#6B7184", bg: "#F5F6FB" },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProjectActivityView({ projectId }: { projectId: string }) {
  const { addToast } = useToast();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("note");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      if (res.ok) setActivity(await res.json());
    } catch { console.error("Error cargando actividad"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchActivity(); }, [projectId]);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/projects/${projectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note, tags, icon: selectedIcon, eventDate: eventDate || null }),
      });
      if (res.ok) {
        setNote(""); setTagsInput(""); setSelectedIcon("note"); setEventDate("");
        fetchActivity();
      } else {
        addToast("Error al agregar la nota.", "error");
      }
    } catch { addToast("Error de conexión.", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activity/${id}`, { method: "DELETE" });
      if (res.ok) setActivity((prev) => prev.filter((a) => a.id !== id));
      else addToast("Error al borrar la nota.", "error");
    } catch { addToast("Error de conexión.", "error"); }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-6">
      <div className="bg-white border border-border-subtle rounded-lg p-4 mb-6">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Escribe una nota sobre este proyecto..."
          className={inputCls + " resize-none"}
        />

        <div className="flex items-center gap-1.5 mt-3">
          {NOTE_ICONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedIcon(opt.key)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                selectedIcon === opt.key ? "bg-action-primary text-action-primary-foreground" : "bg-surface-sidebar text-text-secondary hover:bg-nav-hover"
              }`}
            >
              <HugeiconsIcon icon={opt.icon} size={14} />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Etiquetas separadas por coma"
            className={inputCls}
          />
          <DatePicker value={eventDate} onChange={setEventDate} placeholder="Fecha (opcional)" />
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={handleAddNote}
            disabled={saving || !note.trim()}
            className="px-4 py-2 bg-action-primary text-action-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Agregar nota"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : activity.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-10">Sin actividad todavía</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {activity.map((a) => {
            const meta = TYPE_META[a.type];
            const icon = a.type === "NOTE" ? noteIconFor(a.icon) : meta.icon;
            return (
              <li key={a.id} className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                  <HugeiconsIcon icon={icon} size={15} color={meta.color} />
                </div>
                <div className="flex-1 min-w-0 bg-white border border-border-subtle rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{a.description}</p>
                    {a.type === "NOTE" && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded-md transition-all"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={13} />
                      </button>
                    )}
                  </div>
                  {a.tags && a.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {a.tags.map((tag) => (
                        <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-sidebar text-text-secondary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-text-secondary mt-1.5">
                    {a.createdBy?.name ? `${a.createdBy.name} · ` : ""}{a.eventDate ? formatDate(a.eventDate) : timeAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
