import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon, Calendar03Icon, Call02Icon, Clock01Icon, Location01Icon, Mail01Icon, User02Icon } from "@hugeicons/core-free-icons";
import { Chip, type ChipTone } from "@/src/components/ui";

const STATUS_TONES: Record<string, ChipTone> = { CONFIRMED: "neutral", COMPLETED: "done", CANCELLED: "late" };
const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };

// El marco del producto fuerza 44 px a todo enlace: se anula con min-h-0!/min-w-0!.
const PILL = "inline-flex h-6 min-h-0! min-w-0! max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface-app px-2.5 text-xs text-text-secondary-strong";
const PILL_LINK = `${PILL} font-medium outline-none hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus`;

type Props = {
  status: string;
  /** Día y horario, ya formateados, cada uno en su pastilla. */
  date: string;
  time: string;
  /** Persona de la cita: el contacto del CRM si existe, si no el nombre que dejó al agendar. */
  person: { name: string; href?: string };
  deal?: { title: string; href: string } | null;
  details: { typeName: string | null; location: string | null; email: string | null; phone: string | null };
};

function Pill({ icon, href, children, className = "" }: { icon?: typeof User02Icon; href?: string; children: string; className?: string }) {
  const body = (
    <>
      {icon && <HugeiconsIcon icon={icon} size={12} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </>
  );
  if (!href) return <span className={`${PILL} ${className}`}>{body}</span>;
  const external = href.startsWith("mailto:") || href.startsWith("tel:");
  return external ? (
    <a href={href} className={`${PILL_LINK} ${className}`}>
      {body}
    </a>
  ) : (
    <Link href={href} className={`${PILL_LINK} ${className}`}>
      {body}
    </Link>
  );
}

/** Datos de la cita en pastillas redondas, justo debajo de la barra: estado, persona, deal, fecha, hora, tipo, lugar, correo y teléfono. */
export default function AppointmentInfoPills({ status, date, time, person, deal, details }: Props) {
  return (
    <div aria-label="Datos de la cita" className="flex flex-wrap items-center gap-1.5">
      <Chip tone={STATUS_TONES[status] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Chip>
      <Pill icon={User02Icon} href={person.href} className="max-w-[16rem]">{person.name}</Pill>
      {deal && <Pill icon={Briefcase01Icon} href={deal.href} className="max-w-[16rem]">{deal.title}</Pill>}
      <Pill icon={Calendar03Icon} className="tabular-nums">{date}</Pill>
      <Pill icon={Clock01Icon} className="tabular-nums">{time}</Pill>
      {details.typeName && <Pill>{details.typeName}</Pill>}
      {details.location && <Pill icon={Location01Icon} className="max-w-[16rem]">{details.location}</Pill>}
      {details.email && <Pill icon={Mail01Icon} href={`mailto:${details.email}`} className="max-w-[16rem]">{details.email}</Pill>}
      {details.phone && <Pill icon={Call02Icon} href={`tel:${details.phone}`} className="tabular-nums">{details.phone}</Pill>}
    </div>
  );
}
