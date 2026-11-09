// Saludo del Inicio: variaciones por hora, por estado del trabajo y por día. Puro y determinista:
// la misma persona ve el mismo saludo todo el día (semilla = día + nombre) y cambia de un día a otro.

export type DayPart = "madrugada" | "manana" | "tarde" | "noche";

export type GreetingInput = {
  now: Date;
  name: string | null | undefined;
  sexo?: "MASCULINO" | "FEMENINO" | null;
  /** Tareas pendientes con fecha anterior a hoy. */
  overdueTasks: number;
  /** Tareas pendientes que vencen hoy. */
  pendingToday: number;
  /** Total de tareas pendientes (cualquier fecha). */
  totalPending: number;
  nextAppointment: { inMinutes: number; title: string } | null;
};

export type Greeting = { headline: string; status: string; kicker: string };

const TIME_ZONE = "America/Cancun";

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

function localHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour) % 24;
}

export function dayPart(now: Date): DayPart {
  const hour = localHour(now);
  if (hour < 5) return "madrugada";
  if (hour < 12) return "manana";
  if (hour < 19) return "tarde";
  return "noche";
}

function dayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function greetingFor(input: GreetingInput): Greeting {
  const { now, sexo, overdueTasks, pendingToday, totalPending, nextAppointment } = input;
  const name = firstName(input.name);
  const part = dayPart(now);
  const awake = sexo === "FEMENINO" ? "despierta" : "despierto";
  const pools: Record<DayPart, string[]> = {
    madrugada: [`Aún ${awake}`, "Trabajando de madrugada"],
    manana: ["Buenos días", "Arrancamos el día", "Qué gusto verte"],
    tarde: ["Buenas tardes", "Buena tarde", "Sigamos con el día"],
    noche: ["Buenas noches", "Cerrando el día", "Aún por aquí"],
  };
  const pool = pools[part];
  const phrase = pool[seededIndex(`${dayKey(now)}|${name}`, pool.length)];
  const headline = name ? `${phrase}, ${name}` : phrase;

  let status: string;
  if (overdueTasks > 0) {
    status = `Tienes ${plural(overdueTasks, "tarea vencida", "tareas vencidas")} que atender primero.`;
  } else if (nextAppointment && nextAppointment.inMinutes >= 0 && nextAppointment.inMinutes <= 120) {
    status = `${nextAppointment.title} empieza en ${nextAppointment.inMinutes} min.`;
  } else if (pendingToday > 0) {
    status = `Tienes ${plural(pendingToday, "tarea para hoy", "tareas para hoy")}.`;
  } else if (nextAppointment) {
    status = `Tu próxima cita es ${nextAppointment.title}.`;
  } else if (totalPending > 0) {
    status = `Nada urgente: ${plural(totalPending, "tarea pendiente", "tareas pendientes")}.`;
  } else {
    status = "Estás al día: sin pendientes por ahora.";
  }

  const weekday = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(now);
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(now);
  const touch = dow === "Mon" ? " · empieza la semana" : dow === "Fri" ? " · último empujón de la semana" : "";
  const kicker = weekday.charAt(0).toUpperCase() + weekday.slice(1) + touch;

  return { headline, status, kicker };
}

type TaskLike = { dueDate: string | Date | null | undefined; isCompleted: boolean };
type AppointmentLike = { startTime: string | Date; title: string };

/** Cifras del día para el saludo, a partir de las tareas pendientes y las citas próximas. */
export function summarizeWork(input: { now: Date; tasks: readonly TaskLike[]; appointments: readonly AppointmentLike[] }) {
  const today = dayKey(input.now);
  let overdueTasks = 0;
  let pendingToday = 0;
  let totalPending = 0;
  for (const task of input.tasks) {
    if (task.isCompleted) continue;
    totalPending += 1;
    if (!task.dueDate) continue;
    const due = dayKey(new Date(task.dueDate));
    if (due < today) overdueTasks += 1;
    else if (due === today) pendingToday += 1;
  }
  let nextAppointment: { inMinutes: number; title: string } | null = null;
  for (const appointment of input.appointments) {
    const inMinutes = Math.round((new Date(appointment.startTime).getTime() - input.now.getTime()) / 60000);
    if (inMinutes < 0) continue;
    if (!nextAppointment || inMinutes < nextAppointment.inMinutes) nextAppointment = { inMinutes, title: appointment.title };
  }
  return { overdueTasks, pendingToday, totalPending, nextAppointment };
}
