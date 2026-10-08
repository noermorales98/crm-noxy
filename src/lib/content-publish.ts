export const PUBLISH_STATUSES = ["pendiente", "en_edicion", "editado", "subido"] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export type PublishListFilter = "todas" | PublishStatus;

export function parsePublishStatus(value: unknown, fallback: PublishStatus = "pendiente"): PublishStatus {
  if (value === "listo") return "editado";
  if (typeof value === "string" && (PUBLISH_STATUSES as readonly string[]).includes(value)) {
    return value as PublishStatus;
  }
  return fallback;
}

export function publishStatusLabel(status: string | null | undefined): string {
  const parsed = parsePublishStatus(status);
  switch (parsed) {
    case "pendiente":
      return "Pendiente";
    case "en_edicion":
      return "En edición";
    case "editado":
      return "Editado";
    case "subido":
      return "Subido";
    default: {
      const exhaustive: never = parsed;
      return exhaustive;
    }
  }
}

export function publishStatusColor(status: string | null | undefined): string {
  const parsed = parsePublishStatus(status);
  switch (parsed) {
    case "pendiente":
      return "#8E8E93";
    case "en_edicion":
      return "#C9973B";
    case "editado":
      return "#3545D6";
    case "subido":
      return "#34C759";
    default: {
      const exhaustive: never = parsed;
      return exhaustive;
    }
  }
}

export function matchesPublishFilter(status: string | null | undefined, filter: PublishListFilter): boolean {
  switch (filter) {
    case "todas":
      return true;
    case "pendiente":
    case "en_edicion":
    case "editado":
    case "subido":
      return parsePublishStatus(status) === filter;
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

export function uploadedAtForStatus(
  next: PublishStatus,
  previous: string | null | undefined,
  previousUploadedAt: Date | null | undefined,
): Date | null {
  if (next === "subido") {
    if (previous === "subido" && previousUploadedAt) return previousUploadedAt;
    return new Date();
  }
  return null;
}
