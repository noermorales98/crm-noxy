// Pestañas y agrupación por día de la lista de citas. Funciones puras: la página solo las dibuja.

// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { addDays, formatDateLabel } from "../components/ui/date-time-math.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { utcToZonedParts } from "./manual-appointment.ts";

export type AppointmentTab = "upcoming" | "past" | "cancelled" | "all";

type Timed = { id: string; status: string; startTime: string; endTime: string };

/** Próximas = confirmadas que aún no terminan; Anteriores = terminadas o completadas (nunca canceladas). */
export function filterAppointments<T extends Timed>(rows: T[], tab: AppointmentTab, now = new Date()): T[] {
  const over = (row: T) => new Date(row.endTime) < now;
  const sorted = (list: T[], direction: 1 | -1) => [...list].sort((a, b) => direction * (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
  switch (tab) {
    case "upcoming":
      return sorted(rows.filter((row) => row.status === "CONFIRMED" && !over(row)), 1);
    case "past":
      return sorted(rows.filter((row) => row.status !== "CANCELLED" && (row.status === "COMPLETED" || over(row))), -1);
    case "cancelled":
      return sorted(rows.filter((row) => row.status === "CANCELLED"), -1);
    default:
      return sorted(rows, -1);
  }
}

export function appointmentTabCounts<T extends Timed>(rows: T[], now = new Date()): Record<AppointmentTab, number> {
  return {
    upcoming: filterAppointments(rows, "upcoming", now).length,
    past: filterAppointments(rows, "past", now).length,
    cancelled: filterAppointments(rows, "cancelled", now).length,
    all: rows.length,
  };
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

/** «Hoy», «Mañana», «Ayer» o «vie, 20 nov» (con año si no es el actual), según el día local de la organización. */
export function groupAppointmentsByDay<T extends Timed>(rows: T[], timeZone: string, now = new Date(), order: "asc" | "desc" = "asc"): DayGroup<T>[] {
  const today = utcToZonedParts(now, timeZone).date;
  const labelFor = (day: string) => {
    if (day === today) return "Hoy";
    if (day === addDays(today, 1)) return "Mañana";
    if (day === addDays(today, -1)) return "Ayer";
    const label = formatDateLabel(day);
    return day.slice(0, 4) === today.slice(0, 4) ? label.replace(/ \d{4}$/, "") : label;
  };
  const groups = new Map<string, DayGroup<T>>();
  for (const row of rows) {
    const key = utcToZonedParts(new Date(row.startTime), timeZone).date;
    const group = groups.get(key) ?? { key, label: labelFor(key), items: [] };
    group.items.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (order === "asc" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)));
}
