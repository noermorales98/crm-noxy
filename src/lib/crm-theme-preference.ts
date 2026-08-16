// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { DEFAULT_CRM_THEME_ID, isCrmThemeId, type CrmThemeId } from "./crm-themes.ts";

export type CrmThemeSaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

export type CrmThemePreferenceState = {
  activeThemeId: CrmThemeId;
  confirmedThemeId: CrmThemeId;
  requestVersion: number;
  saveStatus: CrmThemeSaveStatus;
  message: string;
};

function safeThemeId(value: unknown): CrmThemeId {
  return isCrmThemeId(value) ? value : DEFAULT_CRM_THEME_ID;
}

export function themeStorageKey(userId: string): string {
  return `noxy-crm-theme:${encodeURIComponent(userId)}`;
}

export function createThemePreferenceState(cachedTheme?: unknown): CrmThemePreferenceState {
  const themeId = safeThemeId(cachedTheme);
  return {
    activeThemeId: themeId,
    confirmedThemeId: themeId,
    requestVersion: 0,
    saveStatus: "idle",
    message: "",
  };
}

export function applyConfirmedTheme(
  state: CrmThemePreferenceState,
  theme: unknown,
): CrmThemePreferenceState {
  const themeId = safeThemeId(theme);
  return {
    ...state,
    activeThemeId: themeId,
    confirmedThemeId: themeId,
    saveStatus: "idle",
    message: "",
  };
}

export function beginThemeSelection(
  state: CrmThemePreferenceState,
  theme: CrmThemeId,
  requestVersion: number,
): CrmThemePreferenceState {
  return {
    ...state,
    activeThemeId: theme,
    requestVersion,
    saveStatus: "saving",
    message: "Guardando tema…",
  };
}

export function confirmThemeSelection(
  state: CrmThemePreferenceState,
  requestVersion: number,
): CrmThemePreferenceState {
  if (requestVersion !== state.requestVersion) return state;
  return {
    ...state,
    confirmedThemeId: state.activeThemeId,
    saveStatus: "saved",
    message: "Tema guardado.",
  };
}

export function rollbackThemeSelection(
  state: CrmThemePreferenceState,
  requestVersion: number,
): CrmThemePreferenceState {
  if (requestVersion !== state.requestVersion) return state;
  return {
    ...state,
    activeThemeId: state.confirmedThemeId,
    saveStatus: "error",
    message: "No pudimos guardar el tema. Restauramos tu selección anterior.",
  };
}
