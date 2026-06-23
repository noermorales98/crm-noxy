"use client";

import {
  DEFAULT_PDF_EXPORT_OPTIONS,
  resolvePdfExportTheme,
  type KbPdfExportOptions,
} from "@/src/lib/kb-pdf-export-options";
import { renderVectorPagesToPdf } from "@/src/lib/kb-pdf-vector";
import { DEFAULT_MARKDOWN_THEME } from "@/src/lib/kb-markdown-themes";

export type KbPdfPage = {
  title: string;
  content: string;
  markdownTheme: string;
};

function downloadPdfBlob(doc: import("jspdf").jsPDF, filename: string) {
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function renderPagesToPdf(
  pages: KbPdfPage[],
  filename: string,
  options: KbPdfExportOptions = DEFAULT_PDF_EXPORT_OPTIONS
): Promise<void> {
  if (pages.length === 0) {
    throw new Error("No hay páginas para exportar");
  }

  const theme = resolvePdfExportTheme(options);
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  renderVectorPagesToPdf(
    doc,
    pages.map((p) => ({ title: p.title, content: p.content })),
    theme
  );

  downloadPdfBlob(doc, filename);
}

export async function fetchPagesForExport(ids: string[]): Promise<KbPdfPage[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`/api/kb/${id}`);
      if (!res.ok) throw new Error(`No se pudo cargar la página ${id}`);
      const data = await res.json();
      if (data.isFolder) return null;
      return {
        title: data.title || "Sin título",
        content: data.content || "",
        markdownTheme: data.markdownTheme || DEFAULT_MARKDOWN_THEME,
      } satisfies KbPdfPage;
    })
  );

  return results.filter((p): p is KbPdfPage => p !== null);
}

export type { KbPdfExportOptions } from "@/src/lib/kb-pdf-export-options";
