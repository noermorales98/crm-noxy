import {
  DEFAULT_MARKDOWN_THEME,
  getMarkdownTheme,
  type KbMarkdownThemeId,
  type KbMarkdownThemeTokens,
} from "@/src/lib/kb-markdown-themes";

export type KbPdfExportStyleMode = "plain" | "themed";

export type KbPdfExportOptions = {
  styleMode: KbPdfExportStyleMode;
  globalThemeId: KbMarkdownThemeId;
};

export const DEFAULT_PDF_EXPORT_OPTIONS: KbPdfExportOptions = {
  styleMode: "plain",
  globalThemeId: DEFAULT_MARKDOWN_THEME,
};

/** Fixed readable document preset for PDF export. */
export function getReadablePdfTheme(): KbMarkdownThemeTokens {
  const base = getMarkdownTheme("minimal");
  return {
    ...base,
    id: "minimal",
    bg: "#FFFFFF",
    text: "#111111",
    accent: "#333333",
    quoteBar: "#CCCCCC",
    quoteBg: "#FFFFFF",
    quoteStyle: "plain",
    link: "#111111",
    linkHover: "#111111",
    codeBg: "#F4F4F4",
    codeText: "#111111",
    preBg: "#F4F4F4",
    preBorder: "#DDDDDD",
    tableHead: "#F4F4F4",
    headingStyle: "plain",
    hrVariants: ["line"],
    pageIconColor: "#111111",
    pageIconBg: "#F4F4F4",
    fontFamily: "Helvetica",
    fontSize: "17px",
    lineHeight: "1.5",
  };
}

export function resolvePdfExportTheme(_options?: KbPdfExportOptions): KbMarkdownThemeTokens {
  return getReadablePdfTheme();
}
