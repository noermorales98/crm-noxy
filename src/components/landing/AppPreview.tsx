"use client";

import { useEffect, useRef, useState } from "react";
import {
  AiChat01Icon,
  Add01Icon,
  BarChartIcon,
  Book01Icon,
  BrowserIcon,
  Briefcase01Icon,
  Building04Icon,
  Calendar01Icon,
  CalendarCheckIn01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Comment01Icon,
  DashboardSquare01Icon,
  Folder01Icon,
  FolderKanbanIcon,
  Home01Icon,
  InboxIcon,
  Invoice01Icon,
  LockPasswordIcon,
  Notification01Icon,
  Search01Icon,
  SparklesIcon,
  Task01Icon,
  UserIcon,
  UserMultipleIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import { Icon } from "./LandingMocks";
import { useInView, useReducedMotion } from "./useLoop";

/**
 * El CRM en miniatura, copia fiel del real: cabecera con búsqueda, selector de áreas, lista plana con fila activa
 * azul, usuario abajo, franja de indicadores, columnas con puntos de color y etiquetas. Datos inventados.
 * Cambia de área y de pantalla con clic; las tareas y las sugerencias de la IA responden.
 */

type Tone = "indigo" | "violet" | "emerald" | "amber" | "sky" | "rose" | "gray";
const TONE: Record<Tone, string> = {
  indigo: "bg-[#DDE3FE] text-[#3545D6]",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  sky: "bg-sky-100 text-sky-700",
  rose: "bg-rose-100 text-rose-700",
  gray: "bg-surface-sidebar text-text-secondary-strong",
};

type ModeId = "work" | "sales" | "spaces" | "content";
type ItemId = string;
type Item = { id: ItemId; label: string; icon: IconSvgElement };

const MODES: { id: ModeId; label: string; icon: IconSvgElement; items: Item[] }[] = [
  { id: "work", label: "Trabajo", icon: Briefcase01Icon, items: [
    { id: "inicio", label: "Inicio", icon: Home01Icon },
    { id: "tareas", label: "Tareas", icon: Task01Icon },
    { id: "proyectos", label: "Proyectos", icon: FolderKanbanIcon },
    { id: "contactos", label: "Contactos", icon: UserMultipleIcon },
    { id: "citas", label: "Citas Agendadas", icon: CalendarCheckIn01Icon },
  ] },
  { id: "sales", label: "Ventas", icon: BarChartIcon, items: [
    { id: "pipeline", label: "Pipeline de ventas", icon: BarChartIcon },
    { id: "clientes", label: "Clientes", icon: UserMultipleIcon },
    { id: "historial", label: "Historial de tratos", icon: Clock01Icon },
    { id: "cotizaciones", label: "Cotizaciones", icon: Invoice01Icon },
    { id: "formularios", label: "Formularios", icon: BrowserIcon },
  ] },
  { id: "spaces", label: "Espacios", icon: DashboardSquare01Icon, items: [
    { id: "correo", label: "Correo", icon: InboxIcon },
    { id: "documentos", label: "Documentos", icon: Book01Icon },
    { id: "asistente", label: "Asistente", icon: AiChat01Icon },
    { id: "boveda", label: "Bóveda", icon: LockPasswordIcon },
  ] },
  { id: "content", label: "Contenido", icon: Video01Icon, items: [
    { id: "calendario", label: "Calendario", icon: Calendar01Icon },
    { id: "videos", label: "Videos y viralidad", icon: BarChartIcon },
    { id: "empresas", label: "Clientes de contenido", icon: Building04Icon },
  ] },
];

const BOX = "rounded-[8px] border border-line bg-surface-elevated";
const MUTED = "text-[10px] text-text-secondary-strong";

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[9px] font-medium ${TONE[tone]}`}>{children}</span>;
}

function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight text-text-primary">{title}</p>
        {sub && <p className={`${MUTED} mt-0.5`}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-[7px] border px-2 py-1 text-[10px] font-semibold ${dark ? "border-transparent bg-text-secondary-strong text-white" : "border-line bg-surface-elevated text-text-primary"}`}>{children}</span>;
}

/* ───────── Pantallas a medida ───────── */

function Kpis({ cells }: { cells: { k: string; v: string; s: string; chip?: [string, Tone] }[] }) {
  return (
    <div className={`${BOX} mb-3 grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x`}>
      {cells.map((c) => (
        <div key={c.k} className="min-w-0 px-2.5 py-2">
          <p className="truncate text-[9px] text-text-secondary-strong">{c.k}</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-text-primary">
            {c.v}
            {c.chip && <Chip tone={c.chip[1]}>{c.chip[0]}</Chip>}
          </p>
          <p className="truncate text-[9px] text-text-secondary-strong">{c.s}</p>
        </div>
      ))}
    </div>
  );
}

const STAGE_DEFS = [
  { name: "Lead", color: "#6B7280" },
  { name: "Contactado", color: "#6B7280" },
  { name: "Cotizado", color: "#8b5cf6" },
  { name: "Anticipo pagado", color: "#14b8a6" },
  { name: "En producción", color: "#0ea5e9" },
];

type Deal = { id: string; t: string; tag?: [string, Tone]; note?: string; date: string; chat?: number; stage: (t: number) => number | null; hot?: (t: number) => boolean };

/** `t` es el paso de la animación: 0 al inicio, 3 al final. Sin `t` se ve el estado final. */
const DEALS: Deal[] = [
  { id: "lumen", t: "Sitio web Estudio Lumen", tag: ["Formulario", "indigo"], date: "20 nov", stage: (t) => (t >= 2 ? 1 : 0), hot: (t) => t === 2 },
  { id: "nuevo", t: "Rediseño Óptica Vela", tag: ["Nuevo lead", "emerald"], date: "24 nov", stage: (t) => (t >= 1 ? 0 : null), hot: (t) => t === 1 },
  { id: "alba", t: "Redes para Casa Alba", tag: ["Referido", "violet"], note: "En camino", date: "22 nov", chat: 1, stage: (t) => (t >= 3 ? 2 : 1), hot: (t) => t === 3 },
  { id: "brisa", t: "Branding Clínica Brisa", tag: ["Cotización abierta", "sky"], date: "25 nov", chat: 2, stage: () => 2 },
  { id: "norte", t: "Video Taller Norte", tag: ["En curso", "emerald"], date: "2 dic", stage: () => 4 },
];

function Pipeline({ t = 99 }: { t?: number }) {
  const extra = t >= 1 ? 1 : 0;
  return (
    <>
      <PageHead title="Pipeline de ventas" sub={`${3 + extra} deals en proceso, 1 necesita atención`} action={<div className="flex gap-1.5"><Btn><Icon icon={Folder01Icon} size={11} />Historial</Btn><Btn dark><Icon icon={Add01Icon} size={11} />Nuevo deal</Btn></div>} />
      <Kpis cells={[
        { k: "Total deals", v: String(3 + extra), s: "1 necesita atención", chip: ["1 vencido", "rose"] },
        { k: "Ganados", v: "1", s: "1 cerrado este mes" },
        { k: "En proceso", v: String(2 + extra), s: "Deals sin cerrar" },
        { k: "Citas de la semana", v: "4", s: "2 con notas de IA" },
      ]} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STAGE_DEFS.map((st, si) => {
          const deals = DEALS.filter((d) => d.stage(t) === si);
          return (
            <div key={st.name} className="w-[132px] shrink-0 rounded-[8px] bg-surface-sidebar p-1.5 md:min-h-[360px]">
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-text-primary">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                {st.name}
                <span className="font-normal text-text-secondary-strong">{deals.length}</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {deals.map((d) => (
                  <div key={d.id} className={`${BOX} p-2 motion-safe:animate-[crm-enter_320ms_ease-out] ${d.hot?.(t) && t !== 99 ? "ring-2 ring-[#3545D6]/40" : ""}`}>
                    <p className="text-[10px] font-semibold leading-snug text-text-primary">{d.t}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {d.tag && <Chip tone={d.tag[1]}>{d.tag[0]}</Chip>}
                      {d.note && <span className="inline-flex items-center rounded-full border border-line px-1.5 py-px text-[9px] text-text-secondary-strong">{d.note}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-text-secondary-strong">
                      <Icon icon={UserIcon} size={10} />
                      {d.chat ? <span className="ml-auto flex items-center gap-0.5"><Icon icon={Comment01Icon} size={10} />{d.chat}</span> : <span className="ml-auto" />}
                      <span className="flex items-center gap-0.5"><Icon icon={Calendar01Icon} size={10} />{d.date}</span>
                    </div>
                  </div>
                ))}
                <p className="flex items-center gap-1 px-1 py-1 text-[9px] text-text-secondary-strong"><Icon icon={Add01Icon} size={10} />Agregar deal</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Inicio() {
  return (
    <>
      <PageHead title="Buenos días, Mariana" sub="Esto es lo que pide tu atención hoy" />
      <Kpis cells={[
        { k: "Leads nuevos", v: "6", s: "2 de formularios" },
        { k: "Citas hoy", v: "2", s: "Siguiente a las 11:00" },
        { k: "Tareas de hoy", v: "3", s: "1 vencida", chip: ["1 vencida", "rose"] },
        { k: "Sin respuesta", v: "4", s: "Más de 14 días" },
      ]} />
      <ul className={`${BOX} divide-y divide-line`}>
        {[
          ["indigo", Calendar01Icon, "Reunión con Taller Norte", "Hoy, 11:00. Las notas se guardan solas."],
          ["amber", Task01Icon, "Enviar cotización a Clínica Brisa", "Vence hoy"],
          ["violet", Video01Icon, "Grabación para Casa Alba", "Mañana, 10:00"],
        ].map(([tone, icon, t, s]) => (
          <li key={t as string} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] ${TONE[tone as Tone]}`}><Icon icon={icon as IconSvgElement} size={13} /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-text-primary">{t as string}</p>
              <p className="truncate text-[9px] text-text-secondary-strong">{s as string}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Tareas({ t }: { t?: number }) {
  const tasks: [string, Tone, string][] = [
    ["Confirmar reunión con Taller Norte", "emerald", "Hoy"],
    ["Enviar cotización a Clínica Brisa", "rose", "Vence hoy"],
    ["Dar seguimiento a Casa Alba", "amber", "Mañana"],
    ["Preparar guion del reel", "sky", "Viernes"],
  ];
  const [manual, setManual] = useState<Record<string, boolean>>({ [tasks[0][0]]: true });
  const auto = t !== undefined;
  return (
    <>
      <PageHead title="Tareas" sub={auto ? `${tasks.length - Math.min(tasks.length, t + 1)} por hacer` : "Marca una para verla completada"} action={<Btn dark><Icon icon={Add01Icon} size={11} />Nueva tarea</Btn>} />
      <ul className={`${BOX} divide-y divide-line`}>
        {tasks.map(([name, tone, when], i) => {
          const done = auto ? i <= t : !!manual[name];
          return (
            <li key={name}>
              <button type="button" onClick={() => setManual((d) => ({ ...d, [name]: !d[name] }))} className="flex w-full items-center gap-2 px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <Icon icon={CheckmarkCircle02Icon} size={14} className={`transition-colors duration-300 ${done ? "text-emerald-600" : "text-text-secondary"}`} />
                <span className={`min-w-0 flex-1 truncate text-[10px] font-medium transition-colors duration-300 ${done ? "text-text-secondary line-through" : "text-text-primary"}`}>{name}</span>
                <Chip tone={done ? "emerald" : tone}>{done ? "Hecha" : when}</Chip>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Citas({ t }: { t?: number }) {
  const sugg = ["Enviar la propuesta a Ana el jueves", "Llamada de seguimiento, viernes 10:00", "Crear contacto: Sofía Ruiz"];
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const auto = t !== undefined;
  const pending = auto ? sugg.length - t : sugg.length - Object.values(manual).filter(Boolean).length;
  return (
    <>
      <PageHead title="Sesión de descubrimiento" sub="Martes 12:00, con Ana Pérez. Notas importadas de Granola." action={<Chip tone="emerald">Confirmada</Chip>} />
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-text-primary"><Icon icon={SparklesIcon} size={12} className="text-[#3545D6]" />Sugerencias de la IA <Chip tone={pending > 0 ? "indigo" : "emerald"}>{pending > 0 ? `${pending} por revisar` : "Todo al día"}</Chip></p>
      <ul className="flex flex-col gap-1.5">
        {sugg.map((text, i) => {
          const added = auto ? i < t : !!manual[text];
          return (
            <li key={text} className={`${BOX} flex items-center gap-2 px-2.5 py-2 transition-colors duration-300 ${added ? "border-emerald-300" : ""}`}>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] ${TONE[(["amber", "sky", "violet"] as Tone[])[i]]}`}><Icon icon={[Task01Icon, Calendar01Icon, UserIcon][i]} size={12} /></span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-text-primary">{text}</span>
              <button type="button" onClick={() => setManual((a) => ({ ...a, [text]: !a[text] }))} className={`shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-focus ${added ? "bg-emerald-100 text-emerald-700" : "bg-action-primary text-action-primary-foreground"}`}>
                {added ? "Agregada" : "Agregar"}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Calendario({ t }: { t?: number }) {
  const days: [string, [string, Tone][]][] = [["Lun", [["Reel", "indigo"]]], ["Mar", []], ["Mié", [["Post", "violet"], ["Story", "sky"]]], ["Jue", [["Grabar", "amber"]]], ["Vie", [["Video", "emerald"]]]];
  let seen = 0;
  return (
    <>
      <PageHead title="Calendario de contenido" sub="Aviso el miércoles: mañana hay grabación" />
      <div className="grid grid-cols-5 gap-1.5">
        {days.map(([d, items]) => (
          <div key={d}>
            <p className="mb-1 text-center text-[10px] font-semibold text-text-secondary-strong">{d}</p>
            <div className="flex min-h-[110px] flex-col gap-1 rounded-[8px] bg-surface-sidebar p-1">
              {items.map(([it, tone]) => {
                const shown = t === undefined || seen++ <= t;
                return <span key={it} className={`truncate rounded-[5px] px-1.5 py-1 text-[10px] font-medium transition-all duration-300 ${TONE[tone]} ${shown ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0"}`}>{it}</span>;
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Asistente() {
  return (
    <>
      <PageHead title="Asistente" sub="Pregúntale por tus leads, citas o tareas" />
      <div className="flex flex-col gap-2">
        <p className="ml-auto max-w-[80%] rounded-[10px] bg-action-primary px-2.5 py-1.5 text-[10px] text-action-primary-foreground">¿Qué leads llevan más de una semana sin respuesta?</p>
        <p className={`${BOX} max-w-[88%] px-2.5 py-1.5 text-[10px] text-text-primary`}>Hay 4: Casa Alba, Ruta 7 Café, Óptica Vela y Estudio Lumen. ¿Redacto un mensaje de seguimiento para cada uno?</p>
      </div>
    </>
  );
}

type Row = { icon: IconSvgElement; tone: Tone; t: string; s: string; chip?: [string, Tone] };
const LISTS: Record<string, { title: string; sub: string; rows: Row[] }> = {
  proyectos: { title: "Proyectos", sub: "3 en curso", rows: [
    { icon: FolderKanbanIcon, tone: "sky", t: "Lanzamiento Casa Alba", s: "2 de 3 entregables", chip: ["En curso", "sky"] },
    { icon: FolderKanbanIcon, tone: "violet", t: "Rebranding Taller Norte", s: "1 de 4 entregables", chip: ["En curso", "sky"] },
    { icon: FolderKanbanIcon, tone: "amber", t: "Contenido mensual Lumen", s: "5 de 8 piezas", chip: ["En revisión", "amber"] },
  ] },
  contactos: { title: "Contactos", sub: "Quién es quién en tu pipeline", rows: [
    { icon: UserIcon, tone: "indigo", t: "Ana Pérez", s: "Estudio Lumen", chip: ["Lead", "gray"] },
    { icon: UserIcon, tone: "amber", t: "Luis Ortega", s: "Taller Norte", chip: ["Entrevista", "amber"] },
    { icon: UserIcon, tone: "violet", t: "Marta Vela", s: "Óptica Vela", chip: ["Cotizado", "violet"] },
    { icon: UserIcon, tone: "emerald", t: "Sofía Ruiz", s: "Estudio Lumen", chip: ["Cliente", "emerald"] },
  ] },
  clientes: { title: "Clientes", sub: "Quienes ya te contrataron", rows: [
    { icon: Building04Icon, tone: "emerald", t: "Taller Norte", s: "Cliente desde marzo", chip: ["Activo", "emerald"] },
    { icon: Building04Icon, tone: "emerald", t: "Casa Alba", s: "Cliente desde agosto", chip: ["Activo", "emerald"] },
  ] },
  historial: { title: "Historial de tratos", sub: "Ventas cerradas y archivadas", rows: [
    { icon: Clock01Icon, tone: "emerald", t: "Sitio web Taller Norte", s: "Cerrado el 14 nov", chip: ["Ganado", "emerald"] },
    { icon: Clock01Icon, tone: "rose", t: "Campaña Ruta 7 Café", s: "Cerrado el 2 nov", chip: ["Perdido", "rose"] },
  ] },
  formularios: { title: "Formularios", sub: "Captan el lead y activan su seguimiento", rows: [
    { icon: BrowserIcon, tone: "indigo", t: "Solicita tu cotización", s: "14 respuestas", chip: ["Activo", "emerald"] },
    { icon: BrowserIcon, tone: "violet", t: "Agenda una llamada", s: "9 respuestas", chip: ["Activo", "emerald"] },
    { icon: BrowserIcon, tone: "gray", t: "Registro a taller", s: "Sin respuestas", chip: ["Borrador", "gray"] },
  ] },
  correo: { title: "Correo", sub: "Bandeja conectada al CRM", rows: [
    { icon: InboxIcon, tone: "indigo", t: "Ana Pérez", s: "Re: Propuesta de marca", chip: ["Nuevo", "indigo"] },
    { icon: InboxIcon, tone: "gray", t: "Luis Ortega", s: "Confirmo la reunión de hoy" },
  ] },
  documentos: { title: "Documentos", sub: "Base de conocimiento", rows: [
    { icon: Book01Icon, tone: "violet", t: "Guía de onboarding", s: "Actualizado ayer", chip: ["Guía", "violet"] },
    { icon: Book01Icon, tone: "sky", t: "Proceso de grabación", s: "Actualizado hace 3 días", chip: ["Proceso", "sky"] },
  ] },
  boveda: { title: "Bóveda", sub: "Datos sensibles, cifrados", rows: [
    { icon: LockPasswordIcon, tone: "emerald", t: "Instagram de Casa Alba", s: "Acceso compartido con 2 personas", chip: ["Cifrada", "emerald"] },
    { icon: LockPasswordIcon, tone: "emerald", t: "Hosting de Taller Norte", s: "Solo administradores", chip: ["Cifrada", "emerald"] },
  ] },
  videos: { title: "Videos y viralidad", sub: "Métricas importadas y ordenadas por IA", rows: [
    { icon: Video01Icon, tone: "rose", t: "Reel: bastidores del estudio", s: "El más visto de la semana", chip: ["Sube", "emerald"] },
    { icon: Video01Icon, tone: "sky", t: "Video: caso Taller Norte", s: "Retención estable", chip: ["Estable", "gray"] },
  ] },
  empresas: { title: "Clientes de contenido", sub: "Un calendario por cliente", rows: [
    { icon: Building04Icon, tone: "violet", t: "Casa Alba", s: "5 piezas esta semana", chip: ["Al día", "emerald"] },
    { icon: Building04Icon, tone: "amber", t: "Estudio Lumen", s: "2 piezas por aprobar", chip: ["Pendiente", "amber"] },
  ] },
};

function ListView({ id }: { id: string }) {
  const cfg = LISTS[id];
  return (
    <>
      <PageHead title={cfg.title} sub={cfg.sub} />
      <ul className={`${BOX} divide-y divide-line`}>
        {cfg.rows.map((r) => (
          <li key={r.t} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] ${TONE[r.tone]}`}><Icon icon={r.icon} size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-text-primary">{r.t}</p>
              <p className="truncate text-[9px] text-text-secondary-strong">{r.s}</p>
            </div>
            {r.chip && <Chip tone={r.chip[1]}>{r.chip[0]}</Chip>}
          </li>
        ))}
      </ul>
    </>
  );
}

function Cotizaciones({ t }: { t?: number }) {
  const step = t ?? 2;
  const first: [string, Tone] = [["Enviada", "indigo"], ["Abierta hoy", "sky"], ["Aceptada", "emerald"]][step] as [string, Tone];
  const rows: Row[] = [
    { icon: Invoice01Icon, tone: first[1], t: "Propuesta de marca y contenido", s: "Clínica Brisa", chip: first },
    { icon: Invoice01Icon, tone: "indigo", t: "Plan de redes trimestral", s: "Óptica Vela", chip: ["Enviada", "indigo"] },
    { icon: Invoice01Icon, tone: "emerald", t: "Sitio web corporativo", s: "Taller Norte", chip: ["Aceptada", "emerald"] },
  ];
  if (step >= 2) rows.unshift({ icon: Invoice01Icon, tone: "violet", t: "Plan de contenido Casa Alba", s: "Recién creada", chip: ["Borrador", "gray"] });
  return (
    <>
      <PageHead title="Cotizaciones" sub="Con aviso cuando las abren" action={<Btn dark><Icon icon={Add01Icon} size={11} />Nueva cotización</Btn>} />
      <ul className={`${BOX} divide-y divide-line`}>
        {rows.map((r) => (
          <li key={r.t} className="flex items-center gap-2.5 px-2.5 py-2 motion-safe:animate-[crm-enter_320ms_ease-out]">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] ${TONE[r.tone]}`}><Icon icon={r.icon} size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-text-primary">{r.t}</p>
              <p className="truncate text-[9px] text-text-secondary-strong">{r.s}</p>
            </div>
            {r.chip && <Chip tone={r.chip[1]}>{r.chip[0]}</Chip>}
          </li>
        ))}
      </ul>
    </>
  );
}

function renderView(id: string, t?: number) {
  if (id === "pipeline") return <Pipeline t={t} />;
  if (id === "inicio") return <Inicio />;
  if (id === "tareas") return <Tareas t={t} />;
  if (id === "citas") return <Citas t={t} />;
  if (id === "calendario") return <Calendario t={t} />;
  if (id === "cotizaciones") return <Cotizaciones t={t} />;
  if (id === "asistente") return <Asistente />;
  return <ListView id={id} />;
}

/** Guion de la animación: cada cuadro dice en qué área y pantalla está y en qué paso de esa pantalla. */
const FRAMES: { mode: ModeId; view: ItemId; t: number }[] = [
  ...[0, 1, 2, 3].map((t) => ({ mode: "sales" as ModeId, view: "pipeline", t })),
  ...[0, 1, 2].map((t) => ({ mode: "sales" as ModeId, view: "cotizaciones", t })),
  ...[0, 1, 2, 3].map((t) => ({ mode: "work" as ModeId, view: "tareas", t })),
  ...[0, 1, 2, 3].map((t) => ({ mode: "work" as ModeId, view: "citas", t })),
  ...[0, 1, 2, 3, 4].map((t) => ({ mode: "content" as ModeId, view: "calendario", t })),
];

const FRAME_MS = 900;
const HOLD_MS = 14000;

export default function AppPreview() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [manual, setManual] = useState<{ mode: ModeId; view: ItemId } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = inView && !reduced && manual === null;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const auto = FRAMES[frame];
  const shown = manual ? { ...manual, t: undefined } : reduced ? { mode: "sales" as ModeId, view: "pipeline", t: undefined } : auto;
  const mode = MODES.find((m) => m.id === shown.mode)!;

  /** Tomar el control: la animación se pausa y vuelve sola tras unos segundos sin tocar nada. */
  function take(next: { mode: ModeId; view: ItemId }) {
    setManual(next);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setManual(null), HOLD_MS);
  }

  return (
    <div ref={ref} className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
      <div className="flex min-h-[370px] flex-col md:min-h-[560px] md:flex-row">
        <aside className="flex shrink-0 flex-col gap-2 border-b border-line bg-surface-sidebar p-2.5 md:w-44 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Isotipo_Azul.svg" alt="" width={14} height={14} />
              <span className="text-[11px] font-semibold text-text-primary">Noxy</span>
            </span>
            <span className="flex items-center gap-2 text-text-secondary-strong">
              <Icon icon={Search01Icon} size={13} />
              <Icon icon={Notification01Icon} size={13} />
            </span>
          </div>
          <div className="flex justify-between gap-1 px-0.5" role="group" aria-label="Áreas del CRM">
            {MODES.map((m) => {
              const on = m.id === shown.mode;
              return (
                <button key={m.id} type="button" aria-pressed={on} aria-label={m.label} title={m.label} onClick={() => take({ mode: m.id, view: m.items[0].id })} className={`flex size-7 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${on ? "bg-surface-elevated text-text-primary ring-1 ring-line" : "text-text-secondary-strong hover:bg-surface-elevated/60"}`}>
                  <Icon icon={m.icon} size={14} />
                </button>
              );
            })}
          </div>
          <nav aria-label={mode.label} className="flex gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
            {mode.items.map((item) => {
              const on = item.id === shown.view;
              return (
                <button key={item.id} type="button" aria-current={on ? "page" : undefined} onClick={() => take({ mode: mode.id, view: item.id })} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[8px] px-2 py-1.5 text-left text-[10px] outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-focus ${on ? "bg-nav-active font-semibold text-[var(--nav-active-ink)]" : "text-text-primary hover:bg-nav-hover"}`}>
                  <Icon icon={item.icon} size={13} className={on ? "" : "text-text-secondary-strong"} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto hidden items-center gap-2 px-1 pt-3 md:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={userAvatarSrc("FEMENINO")} alt="" width={24} height={24} className="size-6 shrink-0 rounded-full object-cover" />
            <span className="leading-tight">
              <span className="block text-[10px] font-semibold text-text-primary">Mariana</span>
              <span className="block text-[9px] text-text-secondary-strong">Propietaria</span>
            </span>
          </div>
        </aside>
        <div className="min-w-0 flex-1 p-3.5 sm:p-4">
          <div key={shown.view} className="motion-safe:animate-[crm-enter_240ms_ease-out]">{renderView(shown.view, shown.t)}</div>
        </div>
      </div>
    </div>
  );
}
