"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, Clock01Icon } from "@hugeicons/core-free-icons";

type PublicTask = {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  dueDate: string | null;
};

export default function PublicProjectTasksView({ token }: { token: string }) {
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/projects/${token}/tasks`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);
  const displayed = activeTab === "completed" ? completedTasks : pendingTasks;

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6">
      <div className="flex items-center border-b border-border-subtle gap-1 mb-6">
        {[
          { key: "pending" as const, label: "Pendientes", count: pendingTasks.length },
          { key: "completed" as const, label: "Completadas", count: completedTasks.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-action-primary text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? "bg-action-primary text-action-primary-foreground" : "bg-gray-100 text-text-secondary"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
          <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={activeTab === "pending" ? Clock01Icon : Tick01Icon} size={28} color="#9ca3af" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            {activeTab === "pending" ? "Sin tareas pendientes" : "Sin tareas completadas"}
          </h3>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {displayed.map((task) => (
              <li key={task.id} className="px-5 py-4 flex items-start gap-4">
                <div
                  className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    task.isCompleted ? "bg-green-500 border-green-500 text-white" : "border-border-subtle bg-white"
                  }`}
                >
                  {task.isCompleted && <HugeiconsIcon icon={Tick01Icon} size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${task.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}>
                      {task.title}
                    </span>
                    {task.dueDate && !task.isCompleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-full bg-amber-50 text-amber-600">
                        {new Date(task.dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={`text-xs leading-relaxed mt-1 ${task.isCompleted ? "text-gray-300 line-through" : "text-text-secondary"}`}>
                      {task.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
