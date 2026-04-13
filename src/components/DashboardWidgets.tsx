"use client";
import { useState } from "react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Task01Icon,
  UserMultipleIcon,
  ArrowRight01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { Appointment, Contact, Task, AppointmentType } from "@prisma/client";

interface DashboardWidgetsProps {
  appointments: (Appointment & { appointmentType: AppointmentType })[];
  contacts: Contact[];
  tasks: Task[];
}

type Tab = "leads" | "citas" | "tareas";

export function DashboardWidgets({ appointments, contacts, tasks }: DashboardWidgetsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  function formatDate(date: Date) {
    if (isToday(date)) return "Hoy, " + format(date, "h:mm a", { locale: es });
    if (isTomorrow(date)) return "Mañana, " + format(date, "h:mm a", { locale: es });
    return format(date, "dd MMM, h:mm a", { locale: es });
  }

  function formatShortDate(date: Date) {
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    return format(date, "dd MMM", { locale: es });
  }

  const tabs: { key: Tab; label: string; icon: any; href: string; count: number }[] = [
    { key: "leads", label: "Últimos Leads", icon: UserMultipleIcon, href: "/contacts", count: contacts.length },
    { key: "citas", label: "Próximas Citas", icon: Calendar01Icon, href: "/appointments", count: appointments.length },
    { key: "tareas", label: "Tareas Pendientes", icon: Task01Icon, href: "/tasks", count: tasks.length },
  ];

  const activeTabData = tabs.find(t => t.key === activeTab)!;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl">
      {/* Tab Header */}
      <div className="flex items-center border-b border-gray-100 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === tab.key
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
              }`}
          >
            <HugeiconsIcon icon={tab.icon} size={14} />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${activeTab === tab.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500"
                  }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto pr-4 shrink-0">
          <Link
            href={activeTabData.href}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Ver todo
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
          </Link>
        </div>
      </div>

      {/* Leads Table */}
      {activeTab === "leads" && (
        <div>
          <div className="grid grid-cols-12 px-6 py-3 bg-gray-50/60 border-b border-gray-100">
            <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Fecha</span>
            <span className="col-span-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nombre</span>
            <span className="col-span-5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Email</span>
            <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Estado</span>
          </div>
          {contacts.length > 0 ? (
            contacts.map((contact, i) => (
              <div
                key={contact.id}
                className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-gray-50/50 transition-colors ${i < contacts.length - 1 ? "border-b border-gray-50" : ""
                  }`}
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-gray-400 tabular-nums">
                    {formatShortDate(new Date(contact.createdAt))}
                  </span>
                </div>
                <span className="col-span-3 text-sm font-medium text-gray-800 truncate pr-3">
                  {contact.firstName} {contact.lastName || ""}
                </span>
                <span className="col-span-5 text-sm text-gray-500 truncate pr-3">
                  {contact.email || "—"}
                </span>
                <span className="col-span-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-50 text-green-700 border border-green-100 tracking-wide">
                    ACTIVO
                  </span>
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={UserMultipleIcon} message="No hay contactos registrados" />
          )}
        </div>
      )}

      {/* Citas Table */}
      {activeTab === "citas" && (
        <div>
          <div className="grid grid-cols-12 px-6 py-3 bg-gray-50/60 border-b border-gray-100">
            <span className="col-span-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Fecha</span>
            <span className="col-span-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nombre</span>
            <span className="col-span-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Tipo</span>
            <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Estado</span>
          </div>
          {appointments.length > 0 ? (
            appointments.map((appt, i) => (
              <div
                key={appt.id}
                className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-gray-50/50 transition-colors ${i < appointments.length - 1 ? "border-b border-gray-50" : ""
                  }`}
              >
                <div className="col-span-3 flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: appt.appointmentType.color }}
                  />
                  <span className="text-xs text-gray-500 tabular-nums flex items-center gap-1">
                    <HugeiconsIcon icon={Clock01Icon} size={11} color="#9ca3af" />
                    {formatDate(new Date(appt.startTime))}
                  </span>
                </div>
                <span className="col-span-4 text-sm font-medium text-gray-800 truncate pr-3">
                  {appt.guestName}
                </span>
                <span className="col-span-3 text-sm text-gray-500 truncate pr-3">
                  {appt.appointmentType.name}
                </span>
                <span className="col-span-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide">
                    CITA
                  </span>
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={Calendar01Icon} message="No hay citas próximas" />
          )}
        </div>
      )}

      {/* Tareas Table */}
      {activeTab === "tareas" && (
        <div>
          <div className="grid grid-cols-12 px-6 py-3 bg-gray-50/60 border-b border-gray-100">
            <span className="col-span-7 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Tarea</span>
            <span className="col-span-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vencimiento</span>
            <span className="col-span-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Estado</span>
          </div>
          {tasks.length > 0 ? (
            tasks.map((task, i) => (
              <div
                key={task.id}
                className={`grid grid-cols-12 px-6 py-3.5 items-center hover:bg-gray-50/50 transition-colors ${i < tasks.length - 1 ? "border-b border-gray-50" : ""
                  }`}
              >
                <div className="col-span-7 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 line-clamp-1 pr-3">{task.title}</span>
                </div>
                <span className="col-span-3 text-xs text-gray-400">
                  {task.dueDate
                    ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: es })
                    : "—"}
                </span>
                <span className="col-span-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-50 text-orange-700 border border-orange-100 tracking-wide">
                    PENDIENTE
                  </span>
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={Task01Icon} message="No hay tareas pendientes" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: any; message: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-gray-300">
      <HugeiconsIcon icon={icon} size={36} color="#d1d5db" />
      <p className="text-sm text-gray-400 mt-3">{message}</p>
    </div>
  );
}
