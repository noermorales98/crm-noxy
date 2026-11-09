"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { CRM_THEMES } from "@/src/lib/crm-themes";
import { SAMPLE_MEMBERS, type WorkspaceData } from "@/src/lib/editorial-data";

type Row = { id: string; name: string; [key: string]: string };
type Config = { heading: string; empty: string; action: string; fields: [string, string, string?][] };
const modules: Record<string, Config> = {
  "/settings/equipo": { heading: "Miembros", empty: "No hay miembros en esta muestra.", action: "Invitar miembro", fields: [["name", "Nombre"], ["email", "Correo", "email"]] },
  "/appointment-types": { heading: "Tipos de Cita", empty: "No hay tipos de cita.", action: "Crear tipo de cita", fields: [["name", "Nombre"], ["duration", "Duración (min)", "number"]] },
  "/companies": { heading: "Empresas", empty: "No hay empresas registradas.", action: "Crear empresa", fields: [["name", "Nombre"], ["website", "Sitio web", "url"]] },
  "/pipeline/clientes": { heading: "Clientes", empty: "No hay clientes recurrentes registrados.", action: "Crear cliente", fields: [["name", "Nombre"], ["monthlyFee", "Cuota mensual (MXN)", "number"], ["billingDay", "Día de cobro", "number"]] },
  "/forms": { heading: "Formularios", empty: "No hay formularios creados.", action: "Crear formulario", fields: [["name", "Nombre"], ["description", "Descripción"]] },
  "/cotizaciones": { heading: "Cotizaciones", empty: "No hay cotizaciones creadas.", action: "Crear cotización", fields: [["name", "Concepto"], ["recipient", "Destinatario"], ["quantity", "Cantidad", "number"], ["unitPrice", "Precio unitario (MXN)", "number"]] },
  "/campaigns": { heading: "Campañas", empty: "No hay campañas creadas.", action: "Crear campaña", fields: [["name", "Nombre"], ["subject", "Asunto"], ["body", "Mensaje", "textarea"]] },
  "/kb": { heading: "Docs", empty: "No hay documentos creados.", action: "Crear documento", fields: [["name", "Título"], ["body", "Contenido", "textarea"]] },
  "/contenido/general": { heading: "Gestión de contenido", empty: "Sin piezas programadas", action: "Crear contenido", fields: [["name", "Título"], ["date", "Fecha", "date"], ["client", "Cliente"]] },
};
export const SAMPLE_VIEW_TITLES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(modules).map(([path, config]) => [path, config.heading])),
  "/settings": "Ajustes", "/settings/digest": "Resumen por WhatsApp", "/profile": "Perfil", "/settings/ai-models": "Modelos de IA", "/projects/create": "Crear proyecto", "/availability": "Disponibilidad", "/cotizaciones/nueva": "Crear cotización", "/cotizaciones/configuracion": "Configuración de cotizaciones", "/emails": "Correo", "/boveda": "Bóveda", "/pipeline/historial": "Historial de tratos",
};
const STORAGE = "noxy.sample.records.v1";
export default function SampleViews({ route, data, setData, appearance, setAppearance, announce }: {
  route: string; data: WorkspaceData; setData: Dispatch<SetStateAction<WorkspaceData>>;
  appearance: string; setAppearance: (value: string) => void; announce: (value: string) => void;
}) {
  const [records, setRecords] = useState<Record<string, Row[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Row | null | undefined>(route === "/cotizaciones/nueva" ? null : undefined);
  const [search, setSearch] = useState("");
  const [reverse, setReverse] = useState(false);
  const [period, setPeriod] = useState("2026-11");
  const [folder, setFolder] = useState("Bandeja de entrada");
  const [composing, setComposing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const hydration = window.setTimeout(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem(STORAGE) || "{}"); if (value && typeof value === "object" && !Array.isArray(value)) {
      const safe = Object.fromEntries(Object.entries(value).filter(([, rows]) => Array.isArray(rows) && rows.every((row: unknown) => row && typeof row === "object" && Object.values(row).every(v => typeof v === "string")))); setRecords({ "/settings/equipo": SAMPLE_MEMBERS.map((name, index) => ({ id: `member-${index}`, name, email: "" })), "/appointment-types": data.appointments.map(a => ({ id: a.id, name: a.title, duration: String((Date.parse(a.end) - Date.parse(a.start)) / 60000) })), ...safe });
    } } catch { /* A damaged sample cache does not affect product records. */ }
    setLoaded(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, [data.appointments]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(STORAGE, JSON.stringify(records)); } catch { announce("No pudimos conservar los cambios en este navegador."); } } }, [records, loaded, announce]);
  useEffect(() => {
    if (editing === undefined || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current; element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, [editing]);
  const project = route.startsWith("/projects/") ? data.projects.find(p => p.id === route.split("/")[2]) : undefined;
  const subsection = route.split("/")[3];
  const base = route.startsWith("/cotizaciones/") ? "/cotizaciones" : route.startsWith("/kb/") ? "/kb" : route.startsWith("/forms/") ? "/forms" : route;
  const config = modules[base];
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    if (!fields.name?.trim()) return;
    const row = { ...fields, id: editing?.id || crypto.randomUUID(), name: fields.name.trim() };
    setRecords(old => ({ ...old, [base]: editing ? (old[base] || []).map(r => r.id === editing.id ? row : r) : [...(old[base] || []), row] }));
    setEditing(undefined); announce("Guardado en este navegador");
  }
  const field = ([key, label, type]: Config["fields"][number], row?: Row | null) => <label key={key}>{label}{type === "textarea" ? <textarea name={key} defaultValue={row?.[key] || ""} /> : <input name={key} type={type || "text"} defaultValue={row?.[key] || ""} required={key === "name"} min={key === "billingDay" || key === "quantity" ? 1 : type === "number" ? 0 : undefined} max={key === "billingDay" ? 31 : undefined} step={type === "number" ? key === "billingDay" || key === "quantity" ? 1 : "0.01" : undefined} />}</label>;
  function settingsSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const entry: Row = { ...values, name: values.name || route, id: route };
    setRecords(old => ({ ...old, [route]: [entry] }));
    if (route === "/settings") setAppearance(values.theme);
    announce("Guardado en este navegador");
  }
  const saved = records[route]?.[0];
  if (project) return subsection === "info" ? <section className="ed-settings"><div><h2>Información</h2><p>{project.owner || "Sin responsable"}</p></div><form className="ed-form ed-panel" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); setData(old => ({ ...old, projects: old.projects.map(p => p.id === project.id ? { ...p, name: String(fields.get("name")).trim(), owner: String(fields.get("owner")) } : p) })); announce("Guardado en este navegador"); }}><label>Nombre<input name="name" defaultValue={project.name} required /></label><label>Responsable<select name="owner" defaultValue={project.owner}>{SAMPLE_MEMBERS.map(name => <option key={name}>{name}</option>)}</select></label><button className="ed-button ed-primary">Guardar cambios</button></form></section> : <section className="ed-panel"><h2>{subsection === "docs" ? "Documentos" : subsection === "correo" ? "Correo" : subsection === "registros" ? "Registros" : "Actividad"}</h2><p className="ed-empty">{subsection === "docs" ? "No hay documentos vinculados." : subsection === "correo" ? "No hay conversaciones vinculadas." : subsection === "registros" ? "No hay registros en este proyecto." : "No hay actividad registrada."}</p></section>;
  if (route === "/projects/create") return <form className="ed-form ed-panel" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get("name")).trim(); if (!name) return; const id = crypto.randomUUID(); setData(old => ({ ...old, projects: [...old.projects, { id, name, owner: String(form.get("owner")), archived: false }] })); announce("Guardado en este navegador"); window.location.hash = `/projects/${id}`; }}><label>Nombre<input name="name" required /></label><label>Responsable<select name="owner">{SAMPLE_MEMBERS.map(n => <option key={n}>{n}</option>)}</select></label><button className="ed-button ed-primary">Crear proyecto</button></form>;
  if (route === "/settings" || route === "/settings/digest" || route === "/profile" || route === "/availability" || route === "/cotizaciones/configuracion") return <section className="ed-settings"><div><h2>{route === "/settings" ? "Apariencia" : route === "/profile" ? "Datos personales" : route === "/availability" ? "Horario semanal" : route === "/settings/digest" ? "Entrega" : "Preferencias"}</h2><p>{route === "/settings" ? appearance : route === "/availability" ? "America/Cancun" : route === "/settings/digest" ? "Entrega desactivada" : "Equipo de muestra"}</p></div><form key={route} className="ed-panel ed-form" onSubmit={settingsSave}>
    {route === "/settings" ? <><label>Tema<select name="theme" defaultValue={appearance}>{CRM_THEMES.map(t => <option key={t.id}>{t.label}</option>)}</select></label><label>Zona horaria<select name="timezone" defaultValue={saved?.timezone || "America/Cancun"}><option>America/Cancun</option><option>America/Mexico_City</option></select></label><p>Google Calendar sin conectar</p></> : route === "/settings/digest" ? <><label>Frecuencia<select name="frequency" defaultValue={saved?.frequency || "Diario"}><option>Diario</option><option>Semanal</option><option>Mensual</option></select></label><label>Hora<input name="time" type="time" defaultValue={saved?.time || "08:00"} required /></label><p>WhatsApp sin configurar</p><button type="button" className="ed-button" onClick={e => { const form = e.currentTarget.form; if (form) { const values = new FormData(form); announce(`${values.get("frequency")} · ${values.get("time")} · Entrega desactivada`); } }}>Previsualizar</button></> : route === "/profile" ? <><label>Nombre<input name="name" defaultValue={saved?.name || SAMPLE_MEMBERS[0]} required /></label><label>Correo<input name="email" type="email" defaultValue={saved?.email || "lucia.vega@example.test"} required /></label></> : route === "/availability" ? <><label>Día<select name="day" defaultValue={saved?.day || "Lunes"}>{["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(day => <option key={day}>{day}</option>)}</select></label><label>Inicio<input name="start" type="time" defaultValue={saved?.start || ""} required /></label><label>Fin<input name="end" type="time" defaultValue={saved?.end || ""} required onInput={e => { const start = e.currentTarget.form?.elements.namedItem("start") as HTMLInputElement; e.currentTarget.setCustomValidity(start?.value && e.currentTarget.value <= start.value ? "El fin debe ser posterior al inicio." : ""); }} /></label><p>Sin excepciones</p></> : <><label>Moneda<select name="currency"><option>MXN</option></select></label><label>Vigencia (días)<input name="validity" type="number" min="1" defaultValue={saved?.validity || "15"} required /></label></>}
    <button className="ed-button ed-primary">Guardar cambios</button>
  </form></section>;
  if (route === "/settings/ai-models") return <section className="ed-settings"><div><h2>Modelos disponibles</h2></div><div className="ed-panel"><p>No hay un proveedor conectado en esta muestra.</p><button className="ed-button" disabled aria-describedby="models-reason">Guardar cambios</button><p id="models-reason" className="ed-message">Configura el proveedor en Ajustes de la aplicación.</p></div></section>;
  if (route === "/emails") return <section className="ed-list-panel"><div className="ed-toolbar"><div className="ed-tabs" aria-label="Carpeta">{["Bandeja de entrada", "Enviados", "Borradores"].map(name => <button key={name} aria-pressed={folder === name} onClick={() => setFolder(name)}>{name}</button>)}</div><button className="ed-button" onClick={() => setComposing(true)}>Redactar</button></div>{composing ? <form className="ed-form ed-panel" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const draft: Row = { id: crypto.randomUUID(), name: String(values.get("subject")), recipient: String(values.get("recipient")), body: String(values.get("body")) }; setRecords(old => ({ ...old, "/emails": [...(old["/emails"] || []), draft] })); announce("Borrador guardado en este navegador"); setFolder("Borradores"); setComposing(false); }}><h2>Mensaje</h2><label>Para<input name="recipient" type="email" required /></label><label>Asunto<input name="subject" required /></label><label>Mensaje<textarea name="body" required /></label><p>Sin cuenta conectada</p><footer><button className="ed-button" type="button" onClick={() => setComposing(false)}>Cancelar</button><button className="ed-button">Guardar borrador</button><button className="ed-button" type="button" disabled>Enviar</button></footer></form> : folder === "Borradores" && records["/emails"]?.length ? <div className="ed-rows">{records["/emails"].map(row => <div key={row.id} className="ed-row"><span className="ed-identity"><strong>{row.name}</strong><small>{row.recipient} · Borrador</small></span></div>)}</div> : <p className="ed-empty">No hay mensajes en esta carpeta.</p>}</section>;
  if (route === "/pipeline/historial" || route === "/boveda") return <section className="ed-panel"><h2>{route === "/boveda" ? "Clientes" : "Tratos cerrados"}</h2><p className="ed-empty">{route === "/boveda" ? "No hay clientes en la bóveda." : "No hay tratos cerrados."}</p><a href={route === "/boveda" ? "#/pipeline/clientes" : "#/pipeline"} className="ed-button">{route === "/boveda" ? "Clientes" : "Pipeline de ventas"}</a></section>;
  if (!config) return <p className="ed-empty">No encontramos este destino.</p>;
  const rows = (records[base] || []).filter(row => Object.values(row).join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b) => a.name.localeCompare(b.name) * (reverse ? -1 : 1)).filter(row => base !== "/contenido/general" || !row.date || row.date.startsWith(period));
  return <section className="ed-list-panel"><div className="ed-toolbar"><label>Buscar<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={config.heading} /></label>{base === "/contenido/general" && <label>Mes<input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></label>}<button className="ed-button" onClick={() => setReverse(v => !v)}>Nombre {reverse ? "↓" : "↑"}</button><button className="ed-button ed-primary" onClick={() => setEditing(null)}>{config.action}</button></div><p className="ed-list-count">{rows.length} {config.heading.toLocaleLowerCase()}</p>{!rows.length ? <p className="ed-empty">{search ? "No hay resultados para esta búsqueda." : config.empty}</p> : <div className="ed-rows">{rows.map(row => <button key={row.id} className="ed-row" onClick={() => setEditing(row)}><span className="ed-identity"><strong>{row.name}</strong><small>{base === "/cotizaciones" ? `${row.recipient || "Sin destinatario"} · Borrador` : base === "/appointment-types" ? `${row.duration || "0"} min` : base === "/settings/equipo" ? row.email || "Miembro de muestra" : base === "/pipeline/clientes" ? `${Number(row.monthlyFee || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN / mes · Día ${row.billingDay || "-"}` : config.fields.filter(([key]) => key !== "name").map(([key]) => row[key]).filter(Boolean).join(" · ") || "Borrador"}</small></span>{base === "/cotizaciones" && <span className="ed-meta">{new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round(Number(row.quantity || 0) * Number(row.unitPrice || 0) * 100) / 100)} MXN</span>}</button>)}</div>}
    {editing !== undefined && <dialog ref={dialog} className="ed-dialog" aria-labelledby="sample-edit-title" onCancel={e => { e.preventDefault(); setEditing(undefined); }}><div className="ed-dialog-inner"><header><h2 id="sample-edit-title">{editing ? "Editar" : config.action}</h2><button className="ed-icon-button" aria-label="Cerrar" onClick={() => setEditing(undefined)}>×</button></header><form className="ed-form" onSubmit={save}>{config.fields.map(spec => field(spec, editing))}<footer><button type="button" className="ed-button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="ed-button ed-primary">Guardar cambios</button></footer></form><p className="ed-message">Los cambios se guardan en este navegador.</p></div></dialog>}
  </section>;
}
