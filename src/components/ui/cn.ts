/** Une clases condicionales: descarta `false`, `null`, `undefined` y cadenas vacías. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
