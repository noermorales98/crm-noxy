"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { HugeiconsIcon } from "@hugeicons/react";
import { CalendarCheckIn01Icon, Clock01Icon, User02Icon, Mail01Icon, CallIcon, CheckmarkCircle01Icon, Cancel01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";

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
      body: JSON.stringify({ status })
    });
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Eliminar Cita",
      description: "¿Estás seguro de que quieres eliminar esta cita? Esta acción la borrará del sistema y liberará el horario de forma permanente.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Cita eliminada y horario liberado exitosamente", "success");
        fetchAppointments();
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch {
      addToast("Error de red", "error");
    }
  };

  const filtered = filter === "ALL" ? appointments : appointments.filter(a => a.status === filter);

  const statusColor = (status: string) => {
    if (status === "CONFIRMED") return "bg-blue-50 text-blue-700";
    if (status === "COMPLETED") return "bg-green-50 text-green-700";
    if (status === "CANCELLED") return "bg-red-50 text-red-500";
    return "bg-gray-100 text-gray-500";
  };

  const statusLabel = (status: string) =>
    ({ CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" }[status] || status);

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <HugeiconsIcon icon={CalendarCheckIn01Icon} size={28} color="#9ca3af" />
              Citas Agendadas
            </h1>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              {["ALL", "CONFIRMED", "COMPLETED", "CANCELLED"].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {s === "ALL" ? "Todas" : statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <HugeiconsIcon icon={CalendarCheckIn01Icon} size={48} color="#d1d5db" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sin citas</h3>
              <p className="text-gray-500 text-sm">Las citas agendadas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(appt => {
                const start = new Date(appt.startTime);
                const end = new Date(appt.endTime);
                return (
                  <div
                    key={appt.id}
                    className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: appt.appointmentType?.color || "#3B82F6" }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{appt.appointmentType?.name}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${statusColor(appt.status)}`}>
                            {statusLabel(appt.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                          <HugeiconsIcon icon={Clock01Icon} size={14} />
                          <span>
                            {start.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · {start.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1"><HugeiconsIcon icon={User02Icon} size={13} />{appt.guestName}</div>
                          <div className="flex items-center gap-1"><HugeiconsIcon icon={Mail01Icon} size={13} />{appt.guestEmail}</div>
                          {appt.guestPhone && (
                            <div className="flex items-center gap-1"><HugeiconsIcon icon={CallIcon} size={13} />{appt.guestPhone}</div>
                          )}
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-gray-400 mt-2 italic">"{appt.notes}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {appt.status === "CONFIRMED" && (
                        <>
                          <button
                            onClick={() => updateStatus(appt.id, "COMPLETED")}
                            className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} /> Completar
                          </button>
                          <button
                            onClick={() => updateStatus(appt.id, "CANCELLED")}
                            className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={13} /> Cancelar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(appt.id)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors mt-auto"
                      >
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
