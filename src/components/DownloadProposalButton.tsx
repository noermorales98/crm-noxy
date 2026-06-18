"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

interface Proposal {
  title: string;
  total: number;
  notes?: string;
  items: ProposalItem[];
}

interface Props {
  proposal: Proposal;
  dealTitle: string;
}

export default function DownloadProposalButton({ proposal, dealTitle }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = 210;
      const margin = 20;
      const contentW = pageW - margin * 2;

      // ── Header background ────────────────────────────────────────────
      doc.setFillColor(30, 30, 30); // #1e1e1e
      doc.rect(0, 0, pageW, 42, "F");

      // Logo text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Noxy CRM", margin, 18);

      // Subtitle
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text("Propuesta comercial", margin, 26);

      // Date top right
      const date = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text(date, pageW - margin, 26, { align: "right" });

      // ── Deal + Proposal title ─────────────────────────────────────────
      let y = 58;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(proposal.title, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Deal: ${dealTitle}`, margin, y);
      y += 12;

      // ── Divider ───────────────────────────────────────────────────────
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // ── Items table header ────────────────────────────────────────────
      const colDesc = margin;
      const colQty = margin + contentW * 0.52;
      const colPrice = margin + contentW * 0.67;
      const colTotal = margin + contentW * 0.82;

      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3, contentW, 8, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("DESCRIPCIÓN", colDesc, y + 2);
      doc.text("CANT.", colQty, y + 2);
      doc.text("PRECIO UNIT.", colPrice, y + 2);
      doc.text("TOTAL", colTotal, y + 2);
      y += 10;

      // ── Items rows ────────────────────────────────────────────────────
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      for (const item of proposal.items) {
        const rowTotal = item.total ?? item.quantity * item.unitPrice;

        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(item.description || "—", contentW * 0.5);
        doc.text(lines, colDesc, y);

        doc.text(String(item.quantity), colQty, y);
        doc.text(formatCurrency(item.unitPrice), colPrice, y);
        doc.text(formatCurrency(rowTotal), colTotal, y);

        y += Math.max(lines.length * 5, 6);

        // Light row separator
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 3;
      }

      // ── Total ─────────────────────────────────────────────────────────
      y += 4;
      doc.setFillColor(30, 30, 30);
      doc.rect(colPrice - 4, y - 4, contentW - (colPrice - margin) + 4, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", colPrice, y + 2);
      doc.text(formatCurrency(proposal.total), colTotal, y + 2);
      y += 16;

      // ── Notes ─────────────────────────────────────────────────────────
      if (proposal.notes) {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Notas:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const noteLines = doc.splitTextToSize(proposal.notes, contentW);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 5 + 8;
      }

      // ── Footer ────────────────────────────────────────────────────────
      const footerY = 287;
      doc.setFillColor(30, 30, 30);
      doc.rect(0, footerY - 6, pageW, 16, "F");
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Generado con Noxy CRM · noxy.app", pageW / 2, footerY + 1, { align: "center" });

      const filename = `propuesta-${proposal.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-border-subtle text-text-secondary hover:bg-surface-sidebar disabled:opacity-50 transition-colors flex items-center gap-1"
    >
      <HugeiconsIcon icon={Download01Icon} size={10} />
      {loading ? "Generando..." : "Descargar PDF"}
    </button>
  );
}
