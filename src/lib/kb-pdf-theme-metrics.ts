import type { KbMarkdownThemeTokens } from "@/src/lib/kb-markdown-themes";

const PT_TO_MM = 0.352778;

export function ptToMm(pt: number): number {
  return pt * PT_TO_MM;
}

export type PdfThemeMetrics = {
  bodyFontPt: number;
  bodyLineHeightMm: number;
  titlePt: number;
  titleMarginBottomMm: number;
  headingPt: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  paragraphMbMm: number;
  headingMarginTopMm: Record<1 | 2 | 3 | 4, number>;
  headingMarginBottomMm: Record<1 | 2 | 3 | 4, number>;
  listIndentMm: number;
  listHangingIndentMm: number;
  listItemGapMm: number;
  codePadMm: number;
  codeFontPt: number;
  codeLineHeightMm: number;
  quoteIndentMm: number;
  quoteBarWidthMm: number;
  hrMarginMm: number;
};

export const READABLE_PDF_METRICS: PdfThemeMetrics = {
  bodyFontPt: 11,
  bodyLineHeightMm: ptToMm(11 * 1.5),
  titlePt: 22,
  titleMarginBottomMm: 8,
  headingPt: {
    1: 18,
    2: 15,
    3: 13,
    4: 11,
    5: 11,
    6: 11,
  },
  paragraphMbMm: 4.2,
  headingMarginTopMm: {
    1: 2,
    2: 6,
    3: 5,
    4: 4,
  },
  headingMarginBottomMm: {
    1: 3,
    2: 2.5,
    3: 2,
    4: 1.5,
  },
  listIndentMm: 6,
  listHangingIndentMm: 8,
  listItemGapMm: 1.5,
  codePadMm: 4,
  codeFontPt: 10,
  codeLineHeightMm: ptToMm(10 * 1.45),
  quoteIndentMm: 10,
  quoteBarWidthMm: 1,
  hrMarginMm: 5,
};

export function getPdfMetrics(_theme?: KbMarkdownThemeTokens): PdfThemeMetrics {
  return READABLE_PDF_METRICS;
}
