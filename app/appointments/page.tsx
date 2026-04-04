"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { HugeiconsIcon } from "@hugeicons/react";
import { CalendarCheckIn01Icon, Clock01Icon, User02Icon, Mail01Icon, CallIcon, CheckmarkCircle01Icon, Cancel01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-100",
  COMPLETED: "bg-green-50 text-green-700 border border-green-100",
  CANCELLED: "bg-red-50 text-red-500 border border-red-100",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const FILTER_TABS = [
  { key: "ALL", label: "Todas" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "CANCELLED", label: "Canceladas" },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    const res = await fetch("/api/appointments");
    if (res.ok) setAppointments(await res.json());
    setIsLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Eliminar cita",
      description: "¿Eliminar esta cita permanentemente? Se liberará el horario.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (res.ok) { addToast("Cita eliminada y horario liberado.", "success"); fetchAppointments(); }
      else addToast("Error al eliminar.", "error");
    } catch { addToast("Error de red.", "error"); }
  };

  const filtered = filter === "ALL" ? appointments : appointments.filter(a => a.status === filter);

  const counts = {
    ALL: appointments.length,
    CONFIRMED: appointments.filter(a => a.status === "CONFIRMED").length,
    COMPLETED: appointments.filter(a => a.status === "COMPLETED").length,
    CANCELLED: appointments.filter(a => a.status === "CANCELLED").length,
  };

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">

          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Citas agendadas</h1>
              {!isLoading && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{appointments.length}</span>}
            </div>
            <p className="text-sm text-gray-500">Visualiza y gestiona todas las citas de tus clientes.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center border-b border-gray-200 mb-6 gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${filter === tab.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {counts[tab.key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={CalendarCheckIn01Icon} size={28} color="#9ca3af" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {filter === "ALL" ? "Sin citas" : `Sin citas ${STATUS_LABELS[filter]?.toLowerCase() || ""}`}
              </h3>
              <p className="text-sm text-gray-500">Las citas agendadas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(appt => {
                const start = new Date(appt.startTime);
                const end = new Date(appt.endTime);
                return (
                  <div key={appt.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all flex items-start justify-between gap-4 group">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Color accent */}
                      <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: appt.appointmentType?.color || "#3B82F6" }} />
                      {/* Date badge */}
                      <div className="w-14 shrink-0 text-center bg-gray-50 rounded-xl p-2 border border-gray-100">
                        <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                          {start.toLocaleDateString("es-MX", { month: "short" })}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 leading-none mt-0.5">
                          {start.getDate()}
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-bold text-gray-900">{appt.appointmentType?.name || "Cita"}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] || "bg-gray-100 text-gray-500"}`}>
                            {STATUS_LABELS[appt.status] || appt.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                          <HugeiconsIcon icon={Clock01Icon} size={13} />
                          <span>
                            {start.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            {start.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5"><HugeiconsIcon icon={User02Icon} size={13} />{appt.guestName}</div>
                          <div className="flex items-center gap-1.5"><HugeiconsIcon icon={Mail01Icon} size={13} />{appt.guestEmail}</div>
                          {appt.guestPhone && <div className="flex items-center gap-1.5"><HugeiconsIcon icon={CallIcon} size={13} />{appt.guestPhone}</div>}
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-gray-400 mt-2 italic bg-gray-50 px-3 py-1.5 rounded-lg">{appt.notes}</p>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {appt.status === "CONFIRMED" && (
                        <>
                          <button onClick={() => updateStatus(appt.id, "COMPLETED")} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-colors border border-green-100">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} /> Completar
                          </button>
                          <button onClick={() => updateStatus(appt.id, "CANCELLED")} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors border border-red-100">
                            <HugeiconsIcon icon={Cancel01Icon} size={13} /> Cancelar
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(appt.id)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                        <HugeiconsIcon icon={Delete01Icon} size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
