export type KbHrVariant =
  | "loop"
  | "scribble"
  | "dots"
  | "diamond"
  | "line"
  | "wave"
  | "stars"
  | "flourish"
  | "dash"
  | "double"
  | "arrow";

export type KbQuoteStyle = "bar" | "card" | "frosted" | "bubble" | "plain";
export type KbRadiusScale = "sharp" | "soft" | "round" | "pill";
export type KbHeadingStyle = "underline" | "plain" | "accent";

export type KbMarkdownThemeId =
  | "minimal"
  | "editorial"
  | "ocean"
  | "warm"
  | "forest"
  | "lavender"
  | "rose"
  | "slate"
  | "ink"
  | "mono"
  | "midnight";

export interface KbMarkdownThemeTokens {
  id: KbMarkdownThemeId;
  label: string;
  bg: string;
  text: string;
  accent: string;
  quoteBar: string;
  quoteBg: string;
  quoteStyle: KbQuoteStyle;
  link: string;
  linkHover: string;
  codeBg: string;
  codeText: string;
  preBg: string;
  preBorder: string;
  tableHead: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  radiusScale: KbRadiusScale;
  headingStyle: KbHeadingStyle;
  hrVariants: KbHrVariant[];
  pageIconColor: string;
  pageIconBg: string;
}

const RADIUS: Record<
  KbRadiusScale,
  { sm: string; md: string; lg: string; img: string; checkbox: string }
> = {
  sharp: { sm: "3px", md: "5px", lg: "6px", img: "6px", checkbox: "3px" },
  soft: { sm: "5px", md: "10px", lg: "12px", img: "12px", checkbox: "4px" },
  round: { sm: "8px", md: "14px", lg: "18px", img: "16px", checkbox: "6px" },
  pill: { sm: "8px", md: "16px", lg: "24px", img: "20px", checkbox: "9999px" },
};

export const KB_MARKDOWN_THEMES: KbMarkdownThemeTokens[] = [
  {
    id: "minimal",
    label: "Minimal",
    bg: "#FFFFFF",
    text: "#37352F",
    accent: "#787774",
    quoteBar: "#D0D0D0",
    quoteBg: "transparent",
    quoteStyle: "plain",
    link: "#337EA9",
    linkHover: "#2563EB",
    codeBg: "#F3F3F1",
    codeText: "#EB5757",
    preBg: "#F7F7F5",
    preBorder: "#EDEDED",
    tableHead: "#FAFAF9",
    fontFamily: "inherit",
    fontSize: "17px",
    lineHeight: "1.75",
    letterSpacing: "-0.011em",
    radiusScale: "soft",
    headingStyle: "underline",
    hrVariants: ["line", "dots"],
    pageIconColor: "#37352F",
    pageIconBg: "#F3F3F1",
  },
  {
    id: "editorial",
    label: "Editorial",
    bg: "#F9F7F2",
    text: "#527AAF",
    accent: "#527AAF",
    quoteBar: "#527AAF",
    quoteBg: "transparent",
    quoteStyle: "bar",
    link: "#527AAF",
    linkHover: "#3D5F8A",
    codeBg: "#EDE9E0",
    codeText: "#C45C5C",
    preBg: "#F3F0E8",
    preBorder: "#E5DFD3",
    tableHead: "#F3F0E8",
    fontFamily: "'Lora', Georgia, 'Times New Roman', serif",
    fontSize: "17px",
    lineHeight: "1.8",
    letterSpacing: "-0.008em",
    radiusScale: "soft",
    headingStyle: "underline",
    hrVariants: ["loop", "scribble", "dots", "diamond"],
    pageIconColor: "#527AAF",
    pageIconBg: "#E4ECF6",
  },
  {
    id: "ocean",
    label: "Océano",
    bg: "#F4F8FC",
    text: "#2E5C8A",
    accent: "#2E5C8A",
    quoteBar: "#4A7BA8",
    quoteBg: "#EBF2FA",
    quoteStyle: "frosted",
    link: "#2E5C8A",
    linkHover: "#1E4A72",
    codeBg: "#E8F0F8",
    codeText: "#C45C5C",
    preBg: "#EBF2FA",
    preBorder: "#D4E3F0",
    tableHead: "#EBF2FA",
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontSize: "17px",
    lineHeight: "1.78",
    letterSpacing: "-0.01em",
    radiusScale: "round",
    headingStyle: "accent",
    hrVariants: ["wave", "loop", "diamond", "dots"],
    pageIconColor: "#2E5C8A",
    pageIconBg: "#D9E8F5",
  },
  {
    id: "warm",
    label: "Cálido",
    bg: "#FFF8F0",
    text: "#5C4A3A",
    accent: "#8B6914",
    quoteBar: "#C4A574",
    quoteBg: "#F9F2E8",
    quoteStyle: "card",
    link: "#7A5C3A",
    linkHover: "#5C4033",
    codeBg: "#F5EDE0",
    codeText: "#B85450",
    preBg: "#F9F2E8",
    preBorder: "#E8DDD0",
    tableHead: "#F9F2E8",
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "17px",
    lineHeight: "1.82",
    letterSpacing: "-0.006em",
    radiusScale: "round",
    headingStyle: "underline",
    hrVariants: ["scribble", "flourish", "dots", "diamond"],
    pageIconColor: "#8B6914",
    pageIconBg: "#F5EBD8",
  },
  {
    id: "forest",
    label: "Bosque",
    bg: "#F0F7F4",
    text: "#1B4332",
    accent: "#2D6A4F",
    quoteBar: "#40916C",
    quoteBg: "#D8F3DC",
    quoteStyle: "card",
    link: "#2D6A4F",
    linkHover: "#1B4332",
    codeBg: "#D8F3DC",
    codeText: "#BC4749",
    preBg: "#E8F5E9",
    preBorder: "#B7E4C7",
    tableHead: "#E8F5E9",
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontSize: "18px",
    lineHeight: "1.75",
    letterSpacing: "0",
    radiusScale: "round",
    headingStyle: "accent",
    hrVariants: ["wave", "flourish", "double"],
    pageIconColor: "#2D6A4F",
    pageIconBg: "#D8F3DC",
  },
  {
    id: "lavender",
    label: "Lavanda",
    bg: "#F8F6FC",
    text: "#5B4B8A",
    accent: "#7C6BAF",
    quoteBar: "#9B8EC4",
    quoteBg: "#EDE9F6",
    quoteStyle: "bubble",
    link: "#6B5B95",
    linkHover: "#4A3F6B",
    codeBg: "#EDE9F6",
    codeText: "#C45C8A",
    preBg: "#F3F0FA",
    preBorder: "#DDD6F0",
    tableHead: "#F3F0FA",
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "17px",
    lineHeight: "1.8",
    letterSpacing: "-0.005em",
    radiusScale: "pill",
    headingStyle: "plain",
    hrVariants: ["stars", "diamond", "loop"],
    pageIconColor: "#7C6BAF",
    pageIconBg: "#EDE9F6",
  },
  {
    id: "rose",
    label: "Rosa",
    bg: "#FFF5F7",
    text: "#7A3E52",
    accent: "#9F4D6A",
    quoteBar: "#C77D8E",
    quoteBg: "#FCE8EE",
    quoteStyle: "frosted",
    link: "#9F4D6A",
    linkHover: "#7A3E52",
    codeBg: "#FCE8EE",
    codeText: "#B85450",
    preBg: "#FFF0F3",
    preBorder: "#F5D0DA",
    tableHead: "#FFF0F3",
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontSize: "17px",
    lineHeight: "1.78",
    letterSpacing: "-0.008em",
    radiusScale: "round",
    headingStyle: "accent",
    hrVariants: ["scribble", "flourish", "stars"],
    pageIconColor: "#9F4D6A",
    pageIconBg: "#FCE8EE",
  },
  {
    id: "slate",
    label: "Pizarra",
    bg: "#F8FAFC",
    text: "#334155",
    accent: "#64748B",
    quoteBar: "#94A3B8",
    quoteBg: "transparent",
    quoteStyle: "bar",
    link: "#475569",
    linkHover: "#1E293B",
    codeBg: "#F1F5F9",
    codeText: "#DC2626",
    preBg: "#F1F5F9",
    preBorder: "#E2E8F0",
    tableHead: "#F1F5F9",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: "16px",
    lineHeight: "1.7",
    letterSpacing: "-0.012em",
    radiusScale: "sharp",
    headingStyle: "plain",
    hrVariants: ["dash", "double", "line"],
    pageIconColor: "#475569",
    pageIconBg: "#E2E8F0",
  },
  {
    id: "ink",
    label: "Tinta",
    bg: "#FAF8F5",
    text: "#1A1A1A",
    accent: "#1A1A1A",
    quoteBar: "#1A1A1A",
    quoteBg: "#F0EDE8",
    quoteStyle: "card",
    link: "#1A1A1A",
    linkHover: "#44403C",
    codeBg: "#F0EDE8",
    codeText: "#991B1B",
    preBg: "#F5F2ED",
    preBorder: "#E7E0D8",
    tableHead: "#F5F2ED",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "18px",
    lineHeight: "1.72",
    letterSpacing: "0.01em",
    radiusScale: "sharp",
    headingStyle: "accent",
    hrVariants: ["flourish", "loop", "arrow"],
    pageIconColor: "#1A1A1A",
    pageIconBg: "#E7E0D8",
  },
  {
    id: "mono",
    label: "Mono",
    bg: "#F6F8FA",
    text: "#24292F",
    accent: "#57606A",
    quoteBar: "#8C959F",
    quoteBg: "#EFF1F3",
    quoteStyle: "plain",
    link: "#0969DA",
    linkHover: "#0550AE",
    codeBg: "#EFF1F3",
    codeText: "#CF222E",
    preBg: "#EFF1F3",
    preBorder: "#D0D7DE",
    tableHead: "#EFF1F3",
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: "15px",
    lineHeight: "1.65",
    letterSpacing: "0",
    radiusScale: "sharp",
    headingStyle: "plain",
    hrVariants: ["dash", "line"],
    pageIconColor: "#24292F",
    pageIconBg: "#EFF1F3",
  },
  {
    id: "midnight",
    label: "Medianoche",
    bg: "#0F1419",
    text: "#E7E9EA",
    accent: "#8B98A5",
    quoteBar: "#536471",
    quoteBg: "#1A2332",
    quoteStyle: "frosted",
    link: "#7DD3FC",
    linkHover: "#BAE6FD",
    codeBg: "#1A2332",
    codeText: "#F87171",
    preBg: "#161D27",
    preBorder: "#2F3842",
    tableHead: "#161D27",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: "16px",
    lineHeight: "1.72",
    letterSpacing: "-0.01em",
    radiusScale: "soft",
    headingStyle: "underline",
    hrVariants: ["stars", "dots", "diamond", "wave"],
    pageIconColor: "#E7E9EA",
    pageIconBg: "#1A2332",
  },
];

export const DEFAULT_MARKDOWN_THEME: KbMarkdownThemeId = "minimal";

export function getMarkdownTheme(id: string | null | undefined): KbMarkdownThemeTokens {
  const found = KB_MARKDOWN_THEMES.find((t) => t.id === id);
  if (found) return found;
  return KB_MARKDOWN_THEMES.find((t) => t.id === DEFAULT_MARKDOWN_THEME) ?? KB_MARKDOWN_THEMES[0];
}

export function isValidMarkdownTheme(id: string): id is KbMarkdownThemeId {
  return KB_MARKDOWN_THEMES.some((t) => t.id === id);
}

export function getHrVariant(theme: KbMarkdownThemeTokens, index: number): KbHrVariant {
  const variants = theme.hrVariants;
  return variants[index % variants.length];
}

export function themeCssVars(theme: KbMarkdownThemeTokens): Record<string, string> {
  const r = RADIUS[theme.radiusScale];
  return {
    "--kb-bg": theme.bg,
    "--kb-text": theme.text,
    "--kb-accent": theme.accent,
    "--kb-quote-bar": theme.quoteBar,
    "--kb-quote-bg": theme.quoteBg,
    "--kb-link": theme.link,
    "--kb-link-hover": theme.linkHover,
    "--kb-code-bg": theme.codeBg,
    "--kb-code-text": theme.codeText,
    "--kb-pre-bg": theme.preBg,
    "--kb-pre-border": theme.preBorder,
    "--kb-table-head": theme.tableHead,
    "--kb-font": theme.fontFamily,
    "--kb-font-size": theme.fontSize,
    "--kb-line-height": theme.lineHeight,
    "--kb-letter-spacing": theme.letterSpacing,
    "--kb-radius-sm": r.sm,
    "--kb-radius-md": r.md,
    "--kb-radius-lg": r.lg,
    "--kb-radius-img": r.img,
    "--kb-radius-checkbox": r.checkbox,
    "--kb-pill-bg": theme.pageIconBg,
    "--kb-pill-color": theme.pageIconColor,
  };
}
