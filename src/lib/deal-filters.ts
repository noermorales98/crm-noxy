// Un solo criterio para «deals que se muestran en consultas». Lo archivado solo aparece
// en el historial (/pipeline/historial) o cuando quien consulta lo pide con includeArchived.
export const ACTIVE_DEALS = { isArchived: false } as const;

/** `{ isArchived: false }` salvo que se pida incluir archivados. Se esparce dentro de un `where`. */
export function dealArchiveFilter(includeArchived?: boolean): { isArchived?: false } {
  return includeArchived ? {} : { ...ACTIVE_DEALS };
}

/** Lee ?includeArchived=1|true de una URL. */
export function wantsArchived(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}
