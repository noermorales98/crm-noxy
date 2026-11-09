export type WorkTask = { id: string; title: string; owner: string; projectId: string | null; due: string | null; completed: boolean };
export type WorkContact = { id: string; name: string; email: string; createdAt: string };
export type WorkProject = { id: string; name: string; owner: string; archived: boolean };
export type WorkAppointment = { id: string; title: string; contact: string; start: string; end: string };
export type WorkspaceData = {
  organization: string; now: string; tasks: WorkTask[]; contacts: WorkContact[];
  projects: WorkProject[]; appointments: WorkAppointment[];
  totals: { contacts?: number; appointments?: number; tasks?: number; projects?: number };
};
export const SAMPLE_NOW = "2026-11-07T09:00:00-05:00";
export const SAMPLE_MEMBERS = ["Lucía Vega", "Mateo Ríos", "Sara León"];
const titles = ["Revisar propuesta editorial", "Enviar cotización web", "Preparar reunión de alcance", "Revisar catálogo", "Confirmar materiales", "Ordenar entregables", "Validar navegación", "Preparar estructura"];
const dates = ["06T17:00", "07T11:00", "07T13:00", "07T16:00", "07T17:00", "09T12:00", "05T10:00", "05T12:00"];
const owners = [0, 1, 0, 2, 1, 2, 0, 1];
export const SAMPLE_DEALS = [
  { id: "d1", title: "Propuesta editorial", contactId: "c2", stage: "Propuesta", cents: 1800000, currency: "MXN" },
  { id: "d2", title: "Sitio comercial", contactId: "c1", stage: "Negociación", cents: 2400000, currency: "MXN" },
  { id: "d3", title: "Catálogo", contactId: "c5", stage: "Contacto", cents: 1200000, currency: "MXN" },
  { id: "d4", title: "Auditoría de contenido", contactId: "c6", stage: "Contacto", cents: 600000, currency: "MXN" },
];
export function createSampleData(): WorkspaceData {
  return {
    organization: "Equipo de muestra", now: SAMPLE_NOW,
    tasks: titles.map((title, i) => ({ id: `t${i + 1}`, title, owner: SAMPLE_MEMBERS[owners[i]], projectId: [0, 1, 2, 6].includes(i) ? "p1" : "p2", due: `2026-11-${dates[i]}:00-05:00`, completed: i >= 6 })),
    contacts: ["Nora Salas", "Iván Leal", "Elena Solís", "Bruno Cid", "Alma Pardo", "Tomás Vela"].map((name, i) => ({ id: `c${i + 1}`, name, email: `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ /g, ".")}@example.test`, createdAt: [2, 3].includes(i) ? `2026-11-07T${i === 2 ? "08:30" : "08:00"}:00-05:00` : `2026-10-${20 + i}T10:00:00-05:00` })),
    projects: [
      { id: "p1", name: "Sitio editorial", owner: SAMPLE_MEMBERS[0], archived: false },
      { id: "p2", name: "Catálogo digital", owner: SAMPLE_MEMBERS[1], archived: false },
      { id: "p3", name: "Archivo de contenidos", owner: SAMPLE_MEMBERS[2], archived: true },
    ],
    appointments: [
      { id: "a1", title: "Alcance web", contact: "Nora Salas", start: "2026-11-07T10:00:00-05:00", end: "2026-11-07T10:30:00-05:00" },
      { id: "a2", title: "Revisión editorial", contact: "Iván Leal", start: "2026-11-07T15:00:00-05:00", end: "2026-11-07T15:30:00-05:00" },
      { id: "a3", title: "Seguimiento", contact: "Elena Solís", start: "2026-11-09T10:00:00-05:00", end: "2026-11-09T10:30:00-05:00" },
    ], totals: {},
  };
}
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cancun", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
export function pendingTasks(tasks: WorkTask[]) {
  return tasks.filter(t => !t.completed).sort((a, b) => (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity));
}
export function overdueTasks(data: WorkspaceData) {
  return pendingTasks(data.tasks).filter(t => t.due && dayKey(t.due) < dayKey(data.now));
}
export function counts(data: WorkspaceData) {
  return { contacts: data.totals.contacts ?? data.contacts.length, tasks: data.totals.tasks ?? pendingTasks(data.tasks).length,
    appointments: data.totals.appointments ?? data.appointments.filter(a => Date.parse(a.start) >= Date.parse(data.now)).length,
    projects: data.totals.projects ?? data.projects.filter(p => !p.archived).length };
}
export function restoreCompleted(tasks: WorkTask[], value: unknown): WorkTask[] {
  if (!Array.isArray(value) || !value.every(v => typeof v === "string")) return tasks;
  const ids = new Set(value);
  return tasks.map(t => ({ ...t, completed: ids.has(t.id) }));
}
const sample = createSampleData();
console.assert(sample.tasks.length === 8 && counts(sample).tasks === 6, "Sample: task totals");
console.assert(overdueTasks(sample).length === 1, "Sample: overdue task");
console.assert(pendingTasks(sample.tasks).filter(t => t.due && dayKey(t.due) === dayKey(SAMPLE_NOW)).length === 4, "Sample: today's tasks");
console.assert(counts(sample).appointments === 3 && sample.appointments.filter(a => dayKey(a.start) === dayKey(SAMPLE_NOW)).length === 2, "Sample: appointments");
console.assert(counts(sample).projects === 2 && sample.projects.length === 3, "Sample: projects");
console.assert(sample.contacts.length === 6 && sample.contacts.filter(c => c.createdAt.startsWith("2026-11")).length === 2, "Sample: contacts");
console.assert(SAMPLE_DEALS.reduce((sum, d) => sum + d.cents, 0) === 6000000, "Sample: 60000 MXN");

/** Only the isolated sample reads browser records. Reject incompatible or malformed cache data. */
export function restoreWorkspace(fallback: WorkspaceData, value: unknown, completed?: unknown): WorkspaceData {
  if (!value || typeof value !== "object") return { ...fallback, tasks: restoreCompleted(fallback.tasks, completed) };
  const cached = value as WorkspaceData;
  const valid = Array.isArray(cached.tasks) && cached.tasks.every(t => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.owner === "string" && typeof t.completed === "boolean" && (t.projectId === null || typeof t.projectId === "string") && (t.due === null || typeof t.due === "string" && Number.isFinite(Date.parse(t.due))))
    && Array.isArray(cached.contacts) && cached.contacts.every(c => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.email === "string" && Number.isFinite(Date.parse(c.createdAt)))
    && Array.isArray(cached.projects) && cached.projects.every(p => p && typeof p.id === "string" && typeof p.name === "string" && typeof p.owner === "string" && typeof p.archived === "boolean");
  return valid ? { ...fallback, tasks: cached.tasks, contacts: cached.contacts, projects: cached.projects } : fallback;
}
console.assert(sample.appointments.every(a => Date.parse(a.end) - Date.parse(a.start) === 30 * 60000), "Sample: appointment durations");
console.assert(["p1", "p2"].every(id => sample.tasks.filter(t => t.projectId === id).length === 4 && sample.tasks.filter(t => t.projectId === id && !t.completed).length === 3), "Sample: project task counts");
console.assert(["Contacto", "Propuesta", "Negociación"].reduce((total, stage) => total + SAMPLE_DEALS.filter(d => d.stage === stage).reduce((sum,d) => sum + d.cents, 0), 0) === SAMPLE_DEALS.reduce((sum,d) => sum + d.cents, 0), "Sample: stages reconcile");
