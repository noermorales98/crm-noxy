import "@fontsource-variable/geist";
import Link from "next/link";
import {
  AiChat02Icon,
  Calendar01Icon,
  Calendar03Icon,
  ChartLineData02Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  FolderLibraryIcon,
  KanbanIcon,
  Link01Icon,
  Mail01Icon,
  Notification03Icon,
  PlugSocketIcon,
  SafeIcon,
  ShieldKeyIcon,
  SmartPhone01Icon,
  UserShield01Icon,
  Video01Icon,
  Book01Icon,
  BookOpen01Icon,
  AiBrain01Icon,
  GoogleIcon,
  SparklesIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import AppPreview from "@/src/components/landing/AppPreview";
import DemoForm from "@/src/components/landing/DemoForm";
import LandingHeader from "@/src/components/landing/LandingHeader";
import Reveal from "@/src/components/landing/Reveal";
import HowItWorks from "@/src/components/landing/HowItWorks";
import { AppointmentMock, ContentMock, DigestMock, Icon, ProjectMock, QuoteMock } from "@/src/components/landing/LandingMocks";

export const LANDING_TITLE = "Noxy CRM: toda la operación comercial de tu agencia en un solo lugar";
export const LANDING_DESCRIPTION =
  "Leads, citas, cotizaciones, proyectos y contenido en un solo CRM, con una IA que lee tus reuniones y propone qué hacer. Tú decides qué agregar. Pide una demo.";

/** Foto de cielo azul con nubes (Unsplash, licencia gratuita, sin atribución obligatoria). */
const SKY = "/bg5.jpg";
const HERO_BG = {
  backgroundImage: `linear-gradient(180deg, rgba(53,69,214,0.78) 0%, rgba(53,69,214,0.5) 36%, rgba(245,246,251,0.7) 76%, var(--color-surface-app) 92%), url(${SKY})`,
  backgroundSize: "cover",
  backgroundPosition: "center top",
} as const;
const BAND_BG = {
  backgroundImage: `linear-gradient(180deg, rgba(53,69,214,0.88) 0%, rgba(53,69,214,0.72) 100%), url(${SKY})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
} as const;

const PANEL_BG = {
  backgroundImage: `linear-gradient(180deg, rgba(53,69,214,0.35) 0%, rgba(53,69,214,0.2) 100%), url(${SKY})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
} as const;

const BTN = "inline-flex min-h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-control px-7 text-base font-semibold outline-none transition-[transform,background-color] duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";



const INTEGRATIONS = [
  { icon: Book01Icon, name: "Notion" },
  { icon: Calendar03Icon, name: "Granola" },
  { icon: GoogleIcon, name: "Google Calendar" },
  { icon: WhatsappIcon, name: "WhatsApp" },
  { icon: Mail01Icon, name: "Correo" },
  { icon: AiBrain01Icon, name: "Modelos de IA" },
];

const BENEFITS = [
  { icon: KanbanIcon, title: "Pipeline unificado", text: "Mueve cada lead por tus etapas y ve qué necesita atención." },
  { icon: Notification03Icon, title: "Seguimiento que no se olvida", text: "Tareas y avisos automáticos para que nadie se quede sin respuesta." },
  { icon: SparklesIcon, title: "IA que propone, tú decides", text: "Lee tus reuniones y sugiere tareas, citas y contactos." },
];

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-line bg-surface-elevated px-3 py-1 text-xs font-semibold text-action-primary">{children}</span>;
}


const GROUPS: { title: string; items: { icon: typeof Mail01Icon; name: string; text: string }[] }[] = [
  {
    title: "Para vender",
    items: [
      { icon: Link01Icon, name: "Formularios públicos", text: "Captan el lead y activan su seguimiento." },
      { icon: Calendar01Icon, name: "Agenda en línea", text: "Disponibilidad, reservas y Google Calendar." },
      { icon: FileEditIcon, name: "Cotizaciones en PDF", text: "Con enlace público para tu cliente." },
      { icon: Mail01Icon, name: "Correo y campañas", text: "Bandeja y envíos programados." },
    ],
  },
  {
    title: "Para operar",
    items: [
      { icon: ChartLineData02Icon, name: "Métricas de video", text: "Importa tus reportes y la IA los ordena." },
      { icon: BookOpen01Icon, name: "Documentos", text: "Base de conocimiento en markdown y PDF." },
      { icon: AiChat02Icon, name: "Asistente de IA", text: "Consulta tus datos con varios modelos." },
    ],
  },
  {
    title: "Para controlar",
    items: [
      { icon: SafeIcon, name: "Bóveda cifrada", text: "Datos sensibles de clientes bajo llave." },
      { icon: UserShield01Icon, name: "Equipo y permisos", text: "Permisos por módulo para cada integrante." },
      { icon: SmartPhone01Icon, name: "App en tu móvil", text: "Se instala y se usa con una mano." },
      { icon: PlugSocketIcon, name: "Conexión con bots", text: "Un asistente crea tareas con tu permiso." },
    ],
  },
];

const TRUST = [
  { icon: KanbanIcon, title: "Aprobación en cada paso", text: "Las sugerencias de la IA se crean solo cuando tú las apruebas. Los avisos y tareas de seguimiento sí son automáticos y los puedes apagar." },
  { icon: ShieldKeyIcon, title: "Tus datos, protegidos", text: "Las contraseñas de la Bóveda van cifradas, cada organización ve solo lo suyo y las notas privadas no llegan a la IA." },
  { icon: UserShield01Icon, title: "Acceso por módulo", text: "Permisos por módulo para cada integrante de tu equipo." },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] scroll-smooth bg-surface-app text-text-primary motion-reduce:scroll-auto [&_h1]:font-[Geist_Variable,var(--font-sans)] [&_h2]:font-[Geist_Variable,var(--font-sans)]">
      <a href="#demo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-control focus:bg-action-primary focus:px-4 focus:py-2 focus:text-action-primary-foreground">
        Ir a pedir una demo
      </a>
      <LandingHeader />

      <main>
        {/* Hero azul con nubes: titular al centro y el CRM debajo */}
        <section className="relative text-action-primary-foreground" style={HERO_BG}>
          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:pb-36 lg:pt-28">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mx-auto max-w-3xl text-4xl font-medium leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">Toda tu operación comercial en un solo CRM.</h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">Leads, citas, cotizaciones y proyectos juntos, con una IA que lee tus reuniones y propone qué hacer. Tú decides.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="#demo" className={`${BTN} bg-brand-obsidian text-white hover:bg-brand-obsidian/85`}><Icon icon={Calendar03Icon} size={20} />Pide una demo</a>
                <a href="#funciones" className={`${BTN} bg-white text-brand-obsidian hover:bg-white/90`}><Icon icon={DashboardSquare01Icon} size={20} />Ver funciones</a>
              </div>
            </div>
            <Reveal className="relative z-10 mx-auto mt-10 min-w-0 max-w-5xl">
              <AppPreview />
            </Reveal>
          </div>
        </section>

        {/* Integraciones */}
        <section aria-label="Integraciones"><div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
          <p className="text-center text-sm text-text-secondary-strong">Se conecta con las herramientas que ya usas</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-text-secondary-strong">
            {INTEGRATIONS.map((it) => (
              <li key={it.name} className="flex items-center gap-2 text-lg font-semibold">
                <Icon icon={it.icon} size={22} />
                {it.name}
              </li>
            ))}
          </ul>
        </div></section>

        {/* Pensado para mover tu operación */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pensado para mover tu operación, no para llenarla de formularios.</h2>
              <p className="mt-4 max-w-lg text-lg text-text-secondary-strong">Cada lead, cita y proyecto vive en el mismo lugar. El CRM te dice qué sigue y la IA se encarga de lo repetitivo.</p>
              <ul className="mt-8 flex flex-col gap-5">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-action-primary text-action-primary-foreground"><Icon icon={b.icon} size={20} /></span>
                    <div>
                      <p className="font-semibold">{b.title}</p>
                      <p className="mt-0.5 text-sm text-text-secondary-strong">{b.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-surface p-5 sm:p-8" style={PANEL_BG}>
              <AppointmentMock />
            </Reveal>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="flujo" className="relative scroll-mt-16 overflow-hidden bg-surface-elevated">
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-[#3545D6]/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-40 size-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Pill>Cómo funciona</Pill>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">De la reunión a la entrega, en un solo lugar.</h2>
              <p className="mt-4 text-lg text-text-secondary-strong">Del primer contacto a la entrega, sin cambiar de herramienta.</p>
            </Reveal>
            <div className="mt-14">
              <HowItWorks />
            </div>
          </div>
        </section>

        {/* Funciones: bento */}
        <section id="funciones" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Pill>Funciones</Pill>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Cada parte del trabajo, ya conectada.</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            <Reveal className="lg:col-span-4">
              <article className="h-full rounded-surface border border-line bg-surface-elevated p-5 sm:p-7">
                <Icon icon={Calendar03Icon} size={22} className="text-action-primary" />
                <h3 className="mt-4 text-xl font-semibold">Tus reuniones se convierten en acciones</h3>
                <p className="mt-2 max-w-xl text-text-secondary-strong">Conecta Granola o Notion, o escribe tus notas. La IA propone tareas, citas y contactos nuevos. Nada se crea hasta que tú lo apruebas.</p>
                <div className="mt-6"><AppointmentMock /></div>
              </article>
            </Reveal>
            <Reveal delay={80} className="lg:col-span-2">
              <article className="flex h-full flex-col rounded-surface bg-brand-obsidian p-5 text-white sm:p-7">
                <Icon icon={Notification03Icon} size={22} className="text-brand-lime" />
                <h3 className="mt-4 text-xl font-semibold">Nada se te escapa</h3>
                <p className="mt-2 text-white/75">Un resumen opcional en tu WhatsApp, a la hora que elijas, con recordatorios de citas y alertas de cobros.</p>
                <div className="mt-auto flex flex-col gap-3 pt-6">
                  <DigestMock />
                  <p className="rounded-surface bg-white/10 px-4 py-3 text-sm text-white/85">Recordatorio: reunión con Taller Norte hoy a las 11:00. Las notas se guardan en la cita.</p>
                  <p className="rounded-surface bg-white/10 px-4 py-3 text-sm text-white/85">Aviso: mañana hay grabación para Casa Alba.</p>
                </div>
              </article>
            </Reveal>
            <Reveal className="lg:col-span-2">
              <article className="h-full rounded-surface border border-line bg-surface-elevated p-5 sm:p-6">
                <Icon icon={FileEditIcon} size={22} className="text-action-primary" />
                <h3 className="mt-4 text-lg font-semibold">Sabes cuándo abrieron tu cotización</h3>
                <p className="mt-1.5 text-sm text-text-secondary-strong">El CRM registra cuando el cliente abre el enlace por primera vez y lo muestra en el historial.</p>
                <div className="mt-5"><QuoteMock /></div>
              </article>
            </Reveal>
            <Reveal delay={80} className="lg:col-span-2">
              <article className="h-full rounded-surface border border-line bg-surface-sidebar p-5 sm:p-6">
                <Icon icon={Video01Icon} size={22} className="text-action-primary" />
                <h3 className="mt-4 text-lg font-semibold">Contenido sin improvisar</h3>
                <p className="mt-1.5 text-sm text-text-secondary-strong">Calendario semanal y aviso antes de cada grabación.</p>
                <div className="mt-5"><ContentMock /></div>
              </article>
            </Reveal>
            <Reveal delay={160} className="lg:col-span-2">
              <article className="h-full rounded-surface border border-line bg-surface-elevated p-5 sm:p-6">
                <Icon icon={FolderLibraryIcon} size={22} className="text-action-primary" />
                <h3 className="mt-4 text-lg font-semibold">Un portal para tu cliente</h3>
                <p className="mt-1.5 text-sm text-text-secondary-strong">Ve el avance de su proyecto sin pedirte actualizaciones.</p>
                <div className="mt-5"><ProjectMock /></div>
              </article>
            </Reveal>
          </div>
        </section>

        {/* Y además */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Y lo que una agencia usa a diario.</h2>
          </Reveal>
          <div className="mt-14 grid gap-12 md:grid-cols-3">
            {GROUPS.map((group, gi) => (
              <Reveal key={group.title} delay={gi * 80}>
                <h3 className="text-sm font-semibold text-action-primary">{group.title}</h3>
                <ul className="mt-5 flex flex-col gap-5">
                  {group.items.map((item) => (
                    <li key={item.name} className="flex gap-3">
                      <Icon icon={item.icon} size={20} className="mt-0.5 shrink-0 text-text-secondary-strong" />
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="mt-0.5 text-sm text-text-secondary-strong">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Control */}
        <section id="control" className="scroll-mt-16 border-y border-line bg-surface-elevated">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
            <Reveal>
              <Pill>Control</Pill>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">La IA propone. Tú decides.</h2>
            </Reveal>
            <ul className="flex flex-col gap-8">
              {TRUST.map((t, i) => (
                <li key={t.title}>
                  <Reveal delay={i * 80} className="flex gap-4">
                    <Icon icon={t.icon} size={22} className="mt-0.5 shrink-0 text-action-primary" />
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-1.5 text-text-secondary-strong">{t.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Demo: banda azul de cierre */}
        <section id="demo" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28">
          <div className="relative overflow-hidden rounded-[28px] px-5 py-12 text-white sm:px-10 lg:px-14 lg:py-16" style={BAND_BG}>
            <div className="relative grid items-center gap-10 lg:grid-cols-5 lg:gap-14">
              <Reveal className="lg:col-span-2">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">¿Listo para ver el CRM con tu caso?</h2>
                <p className="mt-4 text-lg text-white/85">Cuéntanos cómo trabajas hoy y te mostramos Noxy CRM con tus leads, tus citas y tus proyectos. Sin compromiso.</p>
              </Reveal>
              <div className="text-text-primary lg:col-span-3">
                <DemoForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-text-secondary sm:px-6">
          <p>© {new Date().getFullYear()} Noxy Digital</p>
          <Link href="/login" className="font-medium text-text-secondary-strong hover:text-text-primary">Iniciar sesión</Link>
        </div>
      </footer>
    </div>
  );
}
