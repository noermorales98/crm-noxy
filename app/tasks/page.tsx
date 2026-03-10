"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { Check, Clock, Plus } from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
       console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !currentStatus } : t));
    
    try {
       await fetch("/api/tasks", {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ id, isCompleted: !currentStatus })
       });
    } catch (e) {
      console.error(e);
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        fetchTasks();
      }
    } catch (error) {
       console.error("Failed to create task", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks & To-Dos</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>

          {loading ? (
             <div className="text-gray-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No pending tasks</h3>
                <p className="text-gray-500 text-sm">You are all caught up! Enjoy your day.</p>
             </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-50">
                {tasks.map((task) => (
                   <li key={task.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group">
                      <button 
                         onClick={() => toggleTask(task.id, task.isCompleted)}
                         className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}
                      >
                        {task.isCompleted && <Check size={14} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 flex flex-col gap-1">
                         <span className={`text-sm font-medium ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
                         {task.description && (
                           <p className={`text-sm ${task.isCompleted ? 'text-gray-300 line-through' : 'text-gray-500'}`}>{task.description}</p>
                         )}
                         <div className="flex items-center gap-3 text-xs mt-1">
                            {task.deal && <span className="text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded">Deal: {task.deal.title}</span>}
                            {task.contact && <span className="text-gray-400">👤 {task.contact.firstName} {task.contact.lastName}</span>}
                         </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-gray-400 px-2 py-1 bg-gray-50 rounded">
                         {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                   </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>

       {/* Modal for Creating Task */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">What needs to be done?</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                  placeholder="e.g. Call John about the contract"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Additional Details</label>
                <textarea 
                   rows={3}
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm resize-none"
                   placeholder="Optional notes..."
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 px-4 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors text-sm disabled:opacity-50 shadow-sm">{saving ? "Saving..." : "Add Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
