import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { User, Calendar, CheckSquare, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Appointment, Contact, Task, AppointmentType } from "@prisma/client";

interface DashboardWidgetsProps {
  appointments: (Appointment & { appointmentType: AppointmentType })[];
  contacts: Contact[];
  tasks: Task[];
}

export function DashboardWidgets({ appointments, contacts, tasks }: DashboardWidgetsProps) {
  function formatAppointmentDate(date: Date) {
    if (isToday(date)) return "Hoy, " + format(date, "h:mm a", { locale: es });
    if (isTomorrow(date)) return "Mañana, " + format(date, "h:mm a", { locale: es });
    return format(date, "dd MMM yyyy, h:mm a", { locale: es });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Próximas Citas Widget */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Calendar size={20} />
            </div>
            <h3 className="font-semibold text-gray-800">Próximas Citas</h3>
          </div>
          <Link href="/appointments" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
            Ver todo
          </Link>
        </div>
        <div className="p-0 flex-1 overflow-auto">
          {appointments.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {appointments.map((appt) => (
                <li key={appt.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
                  <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: appt.appointmentType.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{appt.guestName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{formatAppointmentDate(new Date(appt.startTime))}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {appt.appointmentType.name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <Calendar size={40} className="mb-2 opacity-50 text-gray-300" />
              <p>No hay citas programadas próximamente.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tareas Pendientes Widget */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
              <CheckSquare size={20} />
            </div>
            <h3 className="font-semibold text-gray-800">Tareas Pendientes</h3>
          </div>
          <Link href="/tasks" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
            Ver todo
          </Link>
        </div>
        <div className="p-0 flex-1 overflow-auto">
          {tasks.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400 shrink-0">
                    <CheckSquare size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-2">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                        <Clock size={14} className="shrink-0" />
                        <span>Vence {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: es })}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <CheckSquare size={40} className="mb-2 opacity-50 text-gray-300" />
              <p>No tienes tareas pendientes, ¡buen trabajo!</p>
            </div>
          )}
        </div>
      </div>

      {/* Últimos Leads Widget */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <Users size={20} />
            </div>
            <h3 className="font-semibold text-gray-800">Últimos Leads</h3>
          </div>
          <Link href="/contacts" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
            Ver todo
          </Link>
        </div>
        <div className="p-0 flex-1 overflow-auto">
          {contacts.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <li key={contact.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 font-medium">
                    {contact.firstName.charAt(0).toUpperCase()}
                    {contact.lastName ? contact.lastName.charAt(0).toUpperCase() : ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {contact.firstName} {contact.lastName || ""}
                    </p>
                    {contact.email && (
                      <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true, locale: es })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <User size={40} className="mb-2 opacity-50 text-gray-300" />
              <p>Todavía no hay contactos registrados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
