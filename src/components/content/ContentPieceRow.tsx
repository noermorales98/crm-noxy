import Link from "next/link";
import { Chip } from "@/src/components/ui";
import { contentTypeLabel } from "@/src/lib/content-client-colors";
import { publishStatusLabel, parsePublishStatus } from "@/src/lib/content-publish";
import type { ContentItemLike } from "@/src/lib/content-dashboard";

/** Calendario general en el mes de la pieza, con su ventana abierta. */
export function pieceHref(item: { id: string; date: string | Date }): string {
  const month = new Date(item.date).toISOString().slice(0, 7);
  return `/contenido/general?mes=${month}&pieza=${item.id}`;
}

const STATUS_TONE = { pendiente: "neutral", en_edicion: "hot", editado: "neutral", subido: "done" } as const;

/** Fila de una pieza: hora o día, título, cliente (punto de su color), tipo y estado. Lleva al calendario del cliente. */
export function ContentPieceRow({ item, color, showDate = false, late = false }: { item: ContentItemLike; color?: string; showDate?: boolean; late?: boolean }) {
  const when = showDate
    ? new Date(item.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" }) + (item.time ? ` · ${item.time}` : "")
    : (item.time ?? "Sin hora");
  return (
    <Link
      href={pieceHref(item)}
      className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control py-1 outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className={`w-24 shrink-0 text-xs tabular-nums ${late ? "font-semibold text-danger" : "text-text-secondary"}`}>{when}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary">{item.title || "Sin título"}</span>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color ?? "var(--nav-active-ink)" }} />
          <span className="truncate">
            {item.clientName} · {contentTypeLabel(item.type)}
          </span>
        </span>
      </span>
      <Chip tone={STATUS_TONE[parsePublishStatus(item.publishStatus)]}>{publishStatusLabel(item.publishStatus)}</Chip>
    </Link>
  );
}
