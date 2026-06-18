import * as HugeIconsAll from "@hugeicons/core-free-icons";

export interface KbIconSelection {
  emoji: string;
  iconColor: string | null;
  iconBg: string | null;
}

export const KB_COLOR_PRESETS = [
  { iconColor: "#337EA9", iconBg: "#E1F0FF", label: "Azul" },
  { iconColor: "#9065B0", iconBg: "#F0E6F9", label: "Morado" },
  { iconColor: "#D9730D", iconBg: "#FFECD2", label: "Naranja" },
  { iconColor: "#D44020", iconBg: "#FFE2E2", label: "Rojo" },
  { iconColor: "#448361", iconBg: "#E2F6E9", label: "Verde" },
  { iconColor: "#787774", iconBg: "#F7F7F5", label: "Gris" },
  { iconColor: "#37352F", iconBg: "#EFEFEF", label: "Carbón" },
  { iconColor: "#5B9BF5", iconBg: "#E8F2FE", label: "Cielo" },
] as const;

export const DEFAULT_ICON_COLOR = "#37352F";
export const DEFAULT_ICON_BG = "#F7F7F5";
export const DEFAULT_FOLDER_ICON_COLOR = "#D9730D";
export const DEFAULT_FOLDER_ICON_BG = "#FFECD2";

/** All HugeIcon export names ending with Icon */
export const HUGEICON_NAMES: string[] = Object.keys(HugeIconsAll)
  .filter((k) => k.endsWith("Icon"))
  .map((k) => k.replace(/Icon$/, ""))
  .sort((a, b) => a.localeCompare(b));

export function getHugeIconComponent(name: string) {
  const key = `${name}Icon` as keyof typeof HugeIconsAll;
  return (HugeIconsAll as Record<string, unknown>)[key] ?? null;
}

export function isHugeIconValue(value: string | null | undefined): value is string {
  return !!value && value.startsWith("icon:");
}

export function parseHugeIconName(value: string | null | undefined): string | null {
  if (!isHugeIconValue(value)) return null;
  return value.slice(5);
}

export function toHugeIconValue(name: string): string {
  return `icon:${name}`;
}

export function searchHugeIcons(query: string, limit = 64, offset = 0): string[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? HUGEICON_NAMES.filter((n) => n.toLowerCase().includes(q))
    : HUGEICON_NAMES;
  return pool.slice(offset, offset + limit);
}

export const DEFAULT_PAGE_ICON_NAME = "File02";
export const DEFAULT_FOLDER_ICON_NAME = "Folder01";

export function defaultIconForNewPage(isFolder: boolean): KbIconSelection {
  const colors = defaultColorsForPage(isFolder);
  return {
    emoji: toHugeIconValue(isFolder ? DEFAULT_FOLDER_ICON_NAME : DEFAULT_PAGE_ICON_NAME),
    iconColor: colors.iconColor,
    iconBg: colors.iconBg,
  };
}

export function defaultColorsForPage(isFolder: boolean) {
  return isFolder
    ? { iconColor: DEFAULT_FOLDER_ICON_COLOR, iconBg: DEFAULT_FOLDER_ICON_BG }
    : { iconColor: DEFAULT_ICON_COLOR, iconBg: DEFAULT_ICON_BG };
}
