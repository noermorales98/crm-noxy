import type { IconSvgElement } from "@hugeicons/react";
import {
  Agreement01Icon,
  Book01Icon,
  Bookmark01Icon,
  Building03Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  File02Icon,
  Folder01Icon,
  FolderLibraryIcon,
  Globe02Icon,
  HeartAddIcon,
  Home01Icon,
  Image01Icon,
  LegalDocument01Icon,
  Link01Icon,
  LockPasswordIcon,
  Megaphone01Icon,
  Note01Icon,
  Notebook01Icon,
  PencilEdit01Icon,
  Presentation01Icon,
  QuoteUpIcon,
  SparklesIcon,
  StarIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";

export const SHARE_FAVICON_ICONS: { id: string; icon: IconSvgElement }[] = [
  { id: "book", icon: Book01Icon },
  { id: "notebook", icon: Notebook01Icon },
  { id: "note", icon: Note01Icon },
  { id: "file", icon: File01Icon },
  { id: "file-text", icon: File02Icon },
  { id: "folder", icon: Folder01Icon },
  { id: "library", icon: FolderLibraryIcon },
  { id: "legal", icon: LegalDocument01Icon },
  { id: "agreement", icon: Agreement01Icon },
  { id: "presentation", icon: Presentation01Icon },
  { id: "quote", icon: QuoteUpIcon },
  { id: "pencil", icon: PencilEdit01Icon },
  { id: "bookmark", icon: Bookmark01Icon },
  { id: "star", icon: StarIcon },
  { id: "sparkles", icon: SparklesIcon },
  { id: "heart", icon: HeartAddIcon },
  { id: "globe", icon: Globe02Icon },
  { id: "link", icon: Link01Icon },
  { id: "home", icon: Home01Icon },
  { id: "building", icon: Building03Icon },
  { id: "calendar", icon: Calendar01Icon },
  { id: "check", icon: CheckmarkCircle02Icon },
  { id: "image", icon: Image01Icon },
  { id: "video", icon: Video01Icon },
  { id: "megaphone", icon: Megaphone01Icon },
  { id: "lock", icon: LockPasswordIcon },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_SHARE_ICON_BG = "#3545d6";

export function shareFaviconIcon(id: string | null | undefined) {
  if (!id) return null;
  return SHARE_FAVICON_ICONS.find((item) => item.id === id) ?? null;
}

export function parseShareIcon(raw: unknown): string | null | "invalid" {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  return shareFaviconIcon(raw) ? raw : "invalid";
}

export function normalizeShareIconBg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!HEX_COLOR.test(value)) return null;
  return value.toLowerCase();
}

export function iconStrokeForBackground(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0B0B18" : "#FFFFFF";
}

function escapeAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function svgAttrName(key: string): string {
  switch (key) {
    case "strokeWidth":
      return "stroke-width";
    case "strokeLinecap":
      return "stroke-linecap";
    case "strokeLinejoin":
      return "stroke-linejoin";
    default:
      return key;
  }
}

export function renderShareFaviconSvg(iconId: string, background: string): string | null {
  const entry = shareFaviconIcon(iconId);
  const bg = normalizeShareIconBg(background);
  if (!entry || !bg) return null;
  const stroke = iconStrokeForBackground(bg);
  const nodes = entry.icon
    .map(([tag, attrs]) => {
      const parts = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => {
          const painted = value === "currentColor" ? stroke : value;
          return `${svgAttrName(key)}="${escapeAttr(painted)}"`;
        });
      return `<${tag} ${parts.join(" ")}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="${bg}"/>
  <g transform="translate(4 4)" fill="none" stroke="${stroke}" color="${stroke}">
    ${nodes}
  </g>
</svg>`;
}
