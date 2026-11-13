// Cálculo de DateField y TimeField: sin DOM ni zonas horarias, para poder probarlo. Las fechas son «YYYY-MM-DD» y las horas «HH:mm».

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

export type DayCell = { date: string; day: number; inMonth: boolean };

/** Seis semanas (42 días) que empiezan en lunes y contienen el mes dado (`month` de 0 a 11). */
export function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const cells: DayCell[] = [];
  for (let index = 0; index < 42; index++) {
    const day = new Date(Date.UTC(year, month, 1 - offset + index));
    cells.push({ date: iso(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()), day: day.getUTCDate(), inMonth: day.getUTCMonth() === month });
  }
  return cells;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function addDays(date: string, delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + delta));
  return iso(moved.getUTCFullYear(), moved.getUTCMonth(), moved.getUTCDate());
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MONTHS_LONG = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const WEEKDAYS_FROM_MONDAY = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/** «vie, 20 nov 2026»; vacío si la fecha no es válida. */
export function formatDateLabel(date: string): string {
  if (!isIsoDate(date)) return "";
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** Horas del día en pasos de `stepMinutes`, de «00:00» en adelante. */
export function timeSlots(stepMinutes: number): string[] {
  const slots: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += stepMinutes) slots.push(`${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`);
  return slots;
}

/** «3:05 p. m.» a partir de «15:05»; vacío si no es una hora válida. */
export function formatTimeLabel(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return "";
  const hour = Number(match[1]);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${match[2]} ${hour < 12 ? "a. m." : "p. m."}`;
}

/** Hora escrita a mano («9:5», «930», «3 pm», «3:15 p. m.») → «HH:mm», o `null` si no se entiende. */
export function parseTimeInput(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  // 1) separar el «am/pm» final, si lo hay
  const suffix = /\s?(a m|p m|am|pm)$/.exec(text);
  const meridiem = suffix ? suffix[1].replace(" ", "") : null;
  const body = (suffix ? text.slice(0, suffix.index) : text).trim();
  // 2) horas y minutos: «10:30», «9:5», «930», «1430» o solo la hora («3»)
  let hourText: string;
  let minuteText = "0";
  if (/^\d{1,2}:\d{1,2}$/.test(body)) [hourText, minuteText] = body.split(":");
  else if (/^\d{3,4}$/.test(body)) [hourText, minuteText] = [body.slice(0, -2), body.slice(-2)];
  else if (/^\d{1,2}$/.test(body)) hourText = body;
  else return null;
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = meridiem === "am" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  }
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}
