import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  BlockContent,
  List,
  ListItem,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
} from "mdast";
import { parseKbMarkdown } from "@/src/lib/kb-pdf-markdown";
import { getPdfMetrics, type PdfThemeMetrics } from "@/src/lib/kb-pdf-theme-metrics";
import type { KbMarkdownThemeTokens } from "@/src/lib/kb-markdown-themes";

export const PDF_MARGIN_MM = 20;
export const PDF_PAGE_WIDTH_MM = 210;
export const PDF_PAGE_HEIGHT_MM = 297;
export const PDF_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;

export type KbPdfVectorPage = {
  title: string;
  content: string;
};

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

type LayoutState = {
  y: number;
  marginTop: number;
  marginLeft: number;
  contentWidth: number;
  pageBottom: number;
  theme: KbMarkdownThemeTokens;
  metrics: PdfThemeMetrics;
};

type TextOpts = {
  textX?: number;
  textWidth?: number;
  marginAfterMm?: number;
  lineHeightMm?: number;
  fontSize?: number;
  style?: FontStyle;
  color?: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function createLayoutState(theme: KbMarkdownThemeTokens): LayoutState {
  return {
    y: PDF_MARGIN_MM,
    marginTop: PDF_MARGIN_MM,
    marginLeft: PDF_MARGIN_MM,
    contentWidth: PDF_CONTENT_WIDTH_MM,
    pageBottom: PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM,
    theme,
    metrics: getPdfMetrics(theme),
  };
}

function setTextColor(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function addPage(doc: jsPDF, state: LayoutState) {
  doc.addPage();
  state.y = state.marginTop;
}

function ensureSpace(doc: jsPDF, state: LayoutState, neededMm: number) {
  if (state.y + neededMm > state.pageBottom) {
    addPage(doc, state);
  }
}

function phrasingToPlain(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "inlineCode") {
        const v = node.value;
        if (v.startsWith("icon:")) return `[${v.slice(5)}]`;
        return v;
      }
      if (node.type === "link") {
        const label = phrasingToPlain(node.children);
        return label ? `${label} (${node.url})` : node.url;
      }
      if (node.type === "image") {
        const alt = node.alt || "imagen";
        return `${alt} (${node.url})`;
      }
      if ("children" in node && Array.isArray(node.children)) {
        return phrasingToPlain(node.children as PhrasingContent[]);
      }
      return "";
    })
    .join("");
}

function drawLines(
  doc: jsPDF,
  state: LayoutState,
  text: string,
  opts: TextOpts = {}
) {
  const textX = opts.textX ?? state.marginLeft;
  const textWidth = opts.textWidth ?? state.contentWidth;
  const fontSize = opts.fontSize ?? state.metrics.bodyFontPt;
  const lh = opts.lineHeightMm ?? state.metrics.bodyLineHeightMm;
  const style = opts.style ?? "normal";
  const color = opts.color ?? state.theme.text;
  const family = style === "normal" || style === "bold" || style === "italic" || style === "bolditalic"
    ? "helvetica"
    : "helvetica";

  doc.setFontSize(fontSize);
  doc.setFont(family, style);
  setTextColor(doc, color);

  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para || " ", textWidth) as string[];
    for (const line of lines) {
      ensureSpace(doc, state, lh);
      doc.text(line, textX, state.y);
      state.y += lh;
    }
  }

  if (opts.marginAfterMm) state.y += opts.marginAfterMm;
}

function drawParagraph(
  doc: jsPDF,
  state: LayoutState,
  nodes: PhrasingContent[],
  opts: TextOpts = {}
) {
  const plain = phrasingToPlain(nodes).trim();
  if (!plain) return;
  drawLines(doc, state, plain, {
    ...opts,
    marginAfterMm: opts.marginAfterMm ?? state.metrics.paragraphMbMm,
  });
}

function drawHeading(doc: jsPDF, state: LayoutState, text: string, depth: number) {
  const d = Math.min(4, Math.max(1, depth)) as 1 | 2 | 3 | 4;
  const fontSize = state.metrics.headingPt[depth as 1 | 2 | 3 | 4 | 5 | 6];
  state.y += state.metrics.headingMarginTopMm[d];
  drawLines(doc, state, text, {
    fontSize,
    style: "bold",
    lineHeightMm: fontSize * 0.352778 * 1.25,
    marginAfterMm: state.metrics.headingMarginBottomMm[d],
  });
}

function drawCodeBlock(doc: jsPDF, state: LayoutState, code: string) {
  const { metrics, theme } = state;
  const pad = metrics.codePadMm;
  const innerWidth = state.contentWidth - pad * 2;
  const lh = metrics.codeLineHeightMm;

  doc.setFont("courier", "normal");
  doc.setFontSize(metrics.codeFontPt);

  const wrappedLines: string[] = [];
  for (const raw of code.replace(/\n$/, "").split("\n")) {
    wrappedLines.push(...(doc.splitTextToSize(raw || " ", innerWidth) as string[]));
  }
  if (wrappedLines.length === 0) wrappedLines.push(" ");

  state.y += metrics.paragraphMbMm * 0.5;
  let idx = 0;

  while (idx < wrappedLines.length) {
    const available = state.pageBottom - state.y - pad * 2;
    const maxLines = Math.max(1, Math.floor(available / lh));
    const slice = wrappedLines.slice(idx, idx + maxLines);
    const blockH = slice.length * lh + pad * 2;

    ensureSpace(doc, state, blockH);
    const topY = state.y;

    const { r, g, b } = hexToRgb(theme.preBg);
    doc.setFillColor(r, g, b);
    doc.rect(state.marginLeft, topY, state.contentWidth, blockH, "F");
    setDrawColor(doc, theme.preBorder);
    doc.setLineWidth(0.3);
    doc.rect(state.marginLeft, topY, state.contentWidth, blockH);

    setTextColor(doc, theme.text);
    let cy = topY + pad + lh * 0.8;
    for (const line of slice) {
      doc.text(line, state.marginLeft + pad, cy);
      cy += lh;
    }

    state.y = topY + blockH;
    idx += slice.length;
  }

  state.y += metrics.paragraphMbMm * 0.5;
}

function drawBlockquote(doc: jsPDF, state: LayoutState, children: RootContent[]) {
  const { metrics, theme } = state;
  const textX = state.marginLeft + metrics.quoteIndentMm;
  const textWidth = state.contentWidth - metrics.quoteIndentMm;
  const barX = state.marginLeft + 2;
  const startY = state.y + metrics.paragraphMbMm * 0.25;

  state.y = startY;
  for (const child of children) {
    if (child.type === "definition") continue;
    renderBlock(doc, state, child as BlockContent, {
      textX,
      textWidth,
      style: "italic",
      color: "#333333",
      marginAfterMm: metrics.listItemGapMm,
    });
  }

  setDrawColor(doc, theme.quoteBar);
  doc.setLineWidth(metrics.quoteBarWidthMm);
  doc.line(barX, startY, barX, state.y);

  state.y += metrics.paragraphMbMm * 0.5;
}

function drawHr(doc: jsPDF, state: LayoutState) {
  state.y += state.metrics.hrMarginMm * 0.5;
  ensureSpace(doc, state, 2);
  setDrawColor(doc, "#DDDDDD");
  doc.setLineWidth(0.4);
  doc.line(state.marginLeft, state.y, state.marginLeft + state.contentWidth, state.y);
  state.y += state.metrics.hrMarginMm * 0.5;
}

function cellToText(cell: TableCell): string {
  return cell.children
    .map((child) => {
      if (child.type === "text") return child.value;
      if ("children" in child) return phrasingToPlain(child.children as PhrasingContent[]);
      return "";
    })
    .join("");
}

function drawTable(doc: jsPDF, state: LayoutState, table: Table) {
  const rows = table.children.map((row) => row.children.map(cellToText));
  if (rows.length === 0) return;

  state.y += state.metrics.paragraphMbMm * 0.5;
  ensureSpace(doc, state, 14);

  autoTable(doc, {
    startY: state.y,
    margin: { left: state.marginLeft, right: state.marginLeft },
    tableWidth: state.contentWidth,
    head: [rows[0]],
    body: rows.slice(1),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: state.theme.text,
      cellPadding: 2.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: state.theme.tableHead,
      textColor: state.theme.text,
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: "#FFFFFF",
      lineColor: "#DDDDDD",
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  state.y = (finalY ?? state.y) + state.metrics.paragraphMbMm;
}

function listPrefix(item: ListItem, ordered: boolean, index: number): string {
  if (item.checked != null) return item.checked ? "[x]" : "[ ]";
  if (ordered) return `${index}.`;
  return "•";
}

function drawListItemText(
  doc: jsPDF,
  state: LayoutState,
  prefix: string,
  text: string,
  depth: number
) {
  const { metrics } = state;
  const baseX = state.marginLeft + depth * metrics.listIndentMm;
  const textX = baseX + metrics.listHangingIndentMm;
  const textWidth = state.contentWidth - (textX - state.marginLeft);
  const lh = metrics.bodyLineHeightMm;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(metrics.bodyFontPt);
  setTextColor(doc, state.theme.text);

  const lines = doc.splitTextToSize(text || " ", textWidth) as string[];
  if (lines.length === 0) lines.push(" ");

  ensureSpace(doc, state, lh * lines.length);
  doc.text(prefix, baseX, state.y);

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      ensureSpace(doc, state, lh);
    }
    doc.text(lines[i], textX, state.y);
    state.y += lh;
  }

  state.y += metrics.listItemGapMm;
}

function renderListItem(
  doc: jsPDF,
  state: LayoutState,
  item: ListItem,
  ordered: boolean,
  index: number,
  depth: number
) {
  const paragraphs = item.children.filter((c) => c.type === "paragraph");
  const other = item.children.filter((c) => c.type !== "paragraph" && c.type !== "list");

  if (paragraphs.length > 0) {
    const [first, ...rest] = paragraphs;
    const firstText = first.type === "paragraph" ? phrasingToPlain(first.children) : "";
    drawListItemText(doc, state, listPrefix(item, ordered, index), firstText, depth);

    for (const p of rest) {
      if (p.type !== "paragraph") continue;
      drawParagraph(doc, state, p.children, {
        textX: state.marginLeft + depth * state.metrics.listIndentMm + state.metrics.listHangingIndentMm,
        textWidth:
          state.contentWidth -
          (depth * state.metrics.listIndentMm + state.metrics.listHangingIndentMm),
        marginAfterMm: state.metrics.listItemGapMm,
      });
    }
  } else if (other.length === 0) {
    drawListItemText(doc, state, listPrefix(item, ordered, index), "", depth);
  }

  for (const child of item.children) {
    if (child.type === "list") {
      renderList(doc, state, child, depth + 1);
    } else if (child.type !== "paragraph") {
      renderBlock(doc, state, child as BlockContent, {
        textX: state.marginLeft + depth * state.metrics.listIndentMm + state.metrics.listHangingIndentMm,
        textWidth:
          state.contentWidth -
          (depth * state.metrics.listIndentMm + state.metrics.listHangingIndentMm),
      });
    }
  }
}

function renderList(doc: jsPDF, state: LayoutState, list: List, depth: number) {
  let index = list.start ?? 1;
  state.y += state.metrics.listItemGapMm;

  for (const item of list.children) {
    renderListItem(doc, state, item, list.ordered ?? false, index, depth);
    if (list.ordered) index += 1;
  }

  state.y += state.metrics.listItemGapMm;
}

function renderBlock(
  doc: jsPDF,
  state: LayoutState,
  node: RootContent | BlockContent,
  opts: TextOpts = {}
) {
  switch (node.type) {
    case "heading":
      drawHeading(doc, state, phrasingToPlain(node.children), node.depth);
      break;
    case "paragraph":
      drawParagraph(doc, state, node.children, opts);
      break;
    case "code":
      drawCodeBlock(doc, state, node.value);
      break;
    case "blockquote":
      drawBlockquote(doc, state, node.children);
      break;
    case "thematicBreak":
      drawHr(doc, state);
      break;
    case "list":
      renderList(doc, state, node, 0);
      break;
    case "table":
      drawTable(doc, state, node);
      break;
    case "html":
      drawLines(doc, state, node.value, {
        ...opts,
        fontSize: state.metrics.codeFontPt,
        style: "normal",
      });
      break;
    default:
      break;
  }
}

function drawDocumentTitle(doc: jsPDF, state: LayoutState, title: string) {
  const { metrics, theme } = state;
  drawLines(doc, state, title || "Sin título", {
    fontSize: metrics.titlePt,
    style: "bold",
    lineHeightMm: metrics.titlePt * 0.352778 * 1.2,
    marginAfterMm: 2,
  });

  setDrawColor(doc, "#DDDDDD");
  doc.setLineWidth(0.35);
  doc.line(state.marginLeft, state.y, state.marginLeft + state.contentWidth, state.y);
  state.y += metrics.titleMarginBottomMm;
}

function renderMarkdownRoot(doc: jsPDF, state: LayoutState, root: Root) {
  for (const node of root.children) {
    renderBlock(doc, state, node);
  }
}

export function renderVectorPagesToPdf(
  doc: jsPDF,
  pages: KbPdfVectorPage[],
  theme: KbMarkdownThemeTokens
) {
  const state = createLayoutState(theme);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (i > 0) {
      addPage(doc, state);
      state.y += 4;
    }

    drawDocumentTitle(doc, state, page.title);
    const body = page.content.trim();
    if (body) {
      renderMarkdownRoot(doc, state, parseKbMarkdown(body));
    } else {
      drawLines(doc, state, "(Sin contenido)", {
        style: "italic",
        color: "#666666",
        marginAfterMm: state.metrics.paragraphMbMm,
      });
    }
  }
}
