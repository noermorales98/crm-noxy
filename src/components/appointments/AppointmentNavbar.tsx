"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiIdeaIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Copy01Icon,
  FlashIcon,
  MoreHorizontalIcon,
  Notion01Icon,
  NoteAddIcon,
  ReloadIcon,
  Unlink01Icon,
} from "@hugeicons/core-free-icons";
import AskAiButton from "@/src/components/ai/AskAiButton";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
import { useToast } from "@/src/context/ToastContext";
import { DEFAULT_MODEL_TARGET, readSuggestionModel, storeSuggestionModel, type SuggestionModelOption } from "@/src/lib/suggestion-model";
import { onAppointmentBusy, onLinkedGranola, requestAppointmentAction, type AppointmentAction, type LinkedGranola } from "@/src/lib/appointment-actions";

// Misma escala que la barra de /kb/:id: botones de 32 px y un solo radio. El marco fuerza 44 px a todo botón: se anula con min-h-0!/min-w-0!.
const TOOL =
  "crm-press inline-flex h-8 min-h-0! min-w-0! shrink-0 items-center justify-center gap-1.5 rounded-control px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 motion-reduce:transition-none";
const QUIET = `${TOOL} text-text-secondary hover:bg-nav-hover hover:text-text-primary`;
const PRIMARY = `${TOOL} bg-action-primary text-action-primary-foreground hover:bg-action-secondary`;
const ITEM = "flex w-full min-h-0! items-start gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-nav-hover focus-visible:bg-nav-hover disabled:opacity-50";

type Props = {
  appointmentId: string;
  title: string;
};

/** Menú desplegable de la barra: se cierra al hacer clic fuera, con Escape o al elegir una opción. */
function Menu({ label, trigger, triggerClass = QUIET, panelClass = "", title = label, children }: { label: string; trigger: ReactNode; triggerClass?: string; panelClass?: string; title?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={title} onClick={() => setOpen((v) => !v)}>
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`crm-floating-menu absolute right-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-surface border border-line bg-surface-elevated py-1 ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: string }) {
  return <p className="px-3 pb-1 pt-2.5 text-xs font-semibold text-text-secondary">{children}</p>;
}

function Item({ icon, title, hint, onClick, disabled }: { icon: typeof NoteAddIcon; title: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" className={ITEM} onClick={onClick} disabled={disabled}>
      <HugeiconsIcon icon={icon} size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary-strong" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-text-secondary">{hint}</span>}
      </span>
    </button>
  );
}

/**
 * Barra de la cita, con el diseño de la de /kb/:id: el título (con ‹ para volver a las citas). Los datos de la cita van
 * debajo, fuera de la barra (`AppointmentInfoPills`). A la derecha: «Acciones» (nota, Notion y Granola
 * explicadas), «Sugerir con IA», «Preguntar a la IA» y un menú ⋯ con lo demás (desvincular, copiar enlace).
 * Cada acción le pide el trabajo a su panel por el bus de acciones.
 */
export default function AppointmentNavbar({ appointmentId, title }: Props) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState<Partial<Record<AppointmentAction, boolean>>>({});
  const [linked, setLinked] = useState<LinkedGranola[]>([]);
  useEffect(() => onAppointmentBusy((action, value) => setBusy((b) => ({ ...b, [action]: value }))), []);
  useEffect(() => onLinkedGranola(setLinked), []);

  // Modelos para «Sugerir con IA». Si el último elegido ya no existe (se ocultó o se retiró), se vuelve al predeterminado.
  const [models, setModels] = useState<SuggestionModelOption[]>([]);
  const [chosen, setChosen] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/models")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: SuggestionModelOption[]) => {
        if (cancelled || !Array.isArray(list)) return;
        // Solo los que se pueden usar: los que no tienen clave no se listan.
        const usable = list.filter((m) => m.configured);
        setModels(usable);
        const stored = readSuggestionModel();
        if (stored && !usable.some((m) => m.id === stored)) storeSuggestionModel("");
        setChosen(usable.some((m) => m.id === stored) ? stored : "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const generateWith = (modelId: string) => {
    setChosen(modelId);
    requestAppointmentAction("generate", modelId || DEFAULT_MODEL_TARGET);
  };
  const groups = Array.from(new Set(models.map((m) => m.group)));

  const working = Boolean(busy.sync || busy.notion);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast("Enlace copiado.", "success");
    } catch {
      addToast("No se pudo copiar el enlace.", "error");
    }
  };

  return (
    <div className="crm-safe-top relative z-30 shrink-0 border-b border-line bg-surface-elevated">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <MobileSidebarToggle />
          <Link
            href="/appointments"
            className="-ml-1 flex size-10 min-h-0! min-w-0! shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary sm:size-8"
            title="Volver a las citas"
            aria-label="Volver a las citas"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 truncate text-base! font-semibold text-text-primary">{title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Menu
            label="Acciones"
            trigger={
              <>
                <HugeiconsIcon icon={working ? ReloadIcon : FlashIcon} size={15} aria-hidden="true" className={working ? "animate-spin motion-reduce:animate-none" : undefined} />
                <span className="hidden sm:inline">{working ? "Trabajando…" : "Acciones"}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={12} aria-hidden="true" className="hidden sm:block" />
              </>
            }
          >
            {(close) => (
              <>
                <Item icon={NoteAddIcon} title="Escribir una nota" hint="Redacta tú la nota de la reunión en markdown. Queda guardada en esta cita." onClick={() => (close(), requestAppointmentAction("write"))} />
                <Item icon={Notion01Icon} title="Importar de Notion" hint="Trae una página de Notion con los apuntes. Debe estar compartida con la integración; importarla otra vez la actualiza." onClick={() => (close(), requestAppointmentAction("notion"))} disabled={Boolean(busy.notion)} />
                <Item icon={ReloadIcon} title="Sincronizar Granola" hint="Busca sesiones nuevas en Granola y vincula a esta cita las que coincidan con su horario e invitados." onClick={() => (close(), requestAppointmentAction("sync"))} disabled={Boolean(busy.sync)} />
              </>
            )}
          </Menu>

          <Menu
            label={busy.generate ? "Leyendo las notas…" : "Sugerir con IA"}
            title="La IA lee las notas y propone tareas, citas y contactos. Elige con qué modelo."
            triggerClass={PRIMARY}
            panelClass="max-h-[26rem]"
            trigger={
              <>
                <HugeiconsIcon icon={AiIdeaIcon} size={15} aria-hidden="true" className={busy.generate ? "animate-spin motion-reduce:animate-none" : undefined} />
                <span className="hidden lg:inline">{busy.generate ? "Leyendo…" : "Sugerir con IA"}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={12} aria-hidden="true" className="hidden lg:block" />
              </>
            }
          >
            {(close) => (
              <>
                <GroupLabel>Modelo de IA</GroupLabel>
                <Item
                  icon={AiIdeaIcon}
                  title={chosen === "" ? "Predeterminado · último usado" : "Predeterminado"}
                  hint="El que está en Ajustes › Modelos de IA."
                  disabled={Boolean(busy.generate)}
                  onClick={() => (close(), generateWith(""))}
                />
                {groups.map((group) => (
                  <div key={group}>
                    <GroupLabel>{group}</GroupLabel>
                    {models
                      .filter((m) => m.group === group)
                      .map((m) => (
                        <Item
                          key={m.id}
                          icon={AiIdeaIcon}
                          title={`${m.name}${chosen === m.id ? " · último usado" : ""}`}
                          hint={m.tags?.join(" · ")}
                          disabled={Boolean(busy.generate)}
                          onClick={() => (close(), generateWith(m.id))}
                        />
                      ))}
                  </div>
                ))}
              </>
            )}
          </Menu>

          <AskAiButton labelFrom="lg" context={{ page: "appointment", id: appointmentId, label: title }} className={`${QUIET} max-lg:w-8 max-lg:px-0`} />

          <Menu label="Más acciones" trigger={<HugeiconsIcon icon={MoreHorizontalIcon} size={16} aria-hidden="true" />}>
            {(close) => (
              <>
                {linked.map((note) => (
                  <Item
                    key={note.id}
                    icon={Unlink01Icon}
                    title={`Desvincular «${note.title?.trim() || "sesión de Granola"}»`}
                    hint="La nota deja de mostrarse en esta cita y queda como «sin asignar»."
                    onClick={() => (close(), requestAppointmentAction("unlink", note.id))}
                  />
                ))}
                <Item icon={Copy01Icon} title="Copiar enlace de la cita" hint="Copia la dirección de esta página." onClick={() => (close(), void copyLink())} />
              </>
            )}
          </Menu>
        </div>
      </div>
    </div>
  );
}
