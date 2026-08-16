// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { isCrmThemeId, type CrmThemeId } from "./crm-themes.ts";

export type CrmThemePatchResult =
  | { ok: true; theme: CrmThemeId }
  | { ok: false; error: string };

export function parseCrmThemePatch(body: unknown): CrmThemePatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Selecciona un tema válido." };
  }

  const theme = (body as Record<string, unknown>).theme;
  if (!isCrmThemeId(theme)) {
    return { ok: false, error: "Selecciona un tema válido." };
  }

  return { ok: true, theme };
}
