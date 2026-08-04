"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

interface PdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface PdfQuote {
  folio: string;
  currency: string;
  issuedAt: string;
  validUntil: string | null;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  stripePaymentLinkUrl: string | null;
  items: PdfItem[];
}

interface PdfSender {
  businessName?: string | null;
  logoUrl?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bankBeneficiary?: string | null;
  bankClabe?: string | null;
  bankSwift?: string | null;
  bankReference?: string | null;
}

interface Props {
  quote: PdfQuote;
  sender: PdfSender | null;
}

async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("png") ? "PNG" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

export default function QuotePdfButton({ quote, sender }: Props) {
  const [loading, setLoading] = useState(false);

  const money = (value: number) => {
    try {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: quote.currency }).format(value);
    } catch {
      return `${quote.currency} ${value.toFixed(2)}`;
    }
  };

  const dateStr = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  async function handleDownload() {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = 210;
      const pageH = 297;
      const margin = 18;
      const contentW = pageW - margin * 2;
      const businessName = sender?.businessName || "Noxy CRM";

      // ── Header ────────────────────────────────────────────────────────
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, pageW, 44, "F");

      let headerTextX = margin;
      if (sender?.logoUrl) {
        const img = await loadImageDataUrl(sender.logoUrl);
        if (img) {
          try {
            doc.addImage(img.dataUrl, img.format, margin, 10, 22, 22);
            headerTextX = margin + 28;
          } catch { /* logo omitido si el formato no es compatible */ }
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(businessName, headerTextX, 18);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      const senderLines = [sender?.taxId ? `RFC: ${sender.taxId}` : null, sender?.email, sender?.phone, sender?.website]
        .filter(Boolean) as string[];
      if (senderLines.length > 0) doc.text(senderLines.join("  ·  "), headerTextX, 25);
      if (sender?.address) {
        const addr = doc.splitTextToSize(sender.address, contentW * 0.6);
        doc.text(addr, headerTextX, 30);
      }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("COTIZACIÓN", pageW - margin, 18, { align: "right" });
      doc.setFontSize(10);
      doc.text(quote.folio, pageW - margin, 25, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text(`Emitida: ${dateStr(quote.issuedAt)}`, pageW - margin, 31, { align: "right" });
      doc.text(`Vigencia: ${dateStr(quote.validUntil)}`, pageW - margin, 36, { align: "right" });

      let y = 56;

      const newPageIfNeeded = (needed: number) => {
        if (y + needed > pageH - 24) {
          doc.addPage();
          y = 20;
        }
      };

      // ── Cliente ───────────────────────────────────────────────────────
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CLIENTE", margin, y);
      y += 5;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      doc.text(quote.clientName, margin, y);
      y += 5;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      const clientLines = [
        quote.clientCompany,
        quote.clientEmail,
        quote.clientPhone,
        quote.clientAddress,
      ].filter(Boolean) as string[];
      for (const line of clientLines) {
        doc.text(doc.splitTextToSize(line, contentW), margin, y);
        y += 4.2;
      }
      y += 6;

      // ── Ítems ─────────────────────────────────────────────────────────
      const colDesc = margin;
      const colQty = margin + contentW * 0.5;
      const colPrice = margin + contentW * 0.62;
      const colDisc = margin + contentW * 0.76;
      const colTotal = pageW - margin;

      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3.5, contentW, 8, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("DESCRIPCIÓN", colDesc, y + 1.5);
      doc.text("CANT.", colQty, y + 1.5);
      doc.text("P. UNIT.", colPrice, y + 1.5);
      doc.text("DESC.", colDisc, y + 1.5);
      doc.text("TOTAL", colTotal, y + 1.5, { align: "right" });
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const item of quote.items) {
        const lines = doc.splitTextToSize(item.description || "—", contentW * 0.47);
        newPageIfNeeded(lines.length * 5 + 8);
        doc.setTextColor(30, 30, 30);
        doc.text(lines, colDesc, y);
        doc.text(String(item.quantity), colQty, y);
        doc.text(money(item.unitPrice), colPrice, y);
        doc.text(item.discount > 0 ? `${item.discount}%` : "—", colDisc, y);
        doc.text(money(item.total), colTotal, y, { align: "right" });
        y += Math.max(lines.length * 5, 6);
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 3;
      }

      // ── Totales ───────────────────────────────────────────────────────
      newPageIfNeeded(30);
      y += 4;
      const totalsX = pageW - margin - 70;
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text("Subtotal:", totalsX, y);
      doc.text(money(quote.subtotal), colTotal, y, { align: "right" });
      y += 5.5;
      doc.text(`Impuestos (${quote.taxRate}%):`, totalsX, y);
      doc.text(money(quote.taxAmount), colTotal, y, { align: "right" });
      y += 4;
      doc.setFillColor(30, 30, 30);
      doc.rect(totalsX - 4, y - 2, contentW - (totalsX - margin) + 4, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL:", totalsX, y + 4.5);
      doc.text(money(quote.total), colTotal, y + 4.5, { align: "right" });
      y += 16;

      // ── Pago en línea (Stripe) ────────────────────────────────────────
      if (quote.stripePaymentLinkUrl) {
        newPageIfNeeded(24);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("PAGO EN LÍNEA", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8.5);
        doc.text(`Paga con tarjeta de forma segura por ${money(quote.total)} en:`, margin, y);
        y += 4.5;
        doc.setTextColor(37, 99, 235);
        doc.textWithLink(quote.stripePaymentLinkUrl, margin, y, { url: quote.stripePaymentLinkUrl });
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.2);
        const linkW = doc.getTextWidth(quote.stripePaymentLinkUrl);
        doc.line(margin, y + 1, margin + Math.min(linkW, contentW), y + 1);
        y += 8;
      }

      // ── Datos bancarios ───────────────────────────────────────────────
      if (sender?.bankClabe || sender?.bankName) {
        newPageIfNeeded(30);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("DATOS PARA TRANSFERENCIA", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8.5);
        const bankLines = [
          sender.bankName ? `Banco: ${sender.bankName}` : null,
          sender.bankBeneficiary ? `Beneficiario: ${sender.bankBeneficiary}` : null,
          sender.bankClabe ? `CLABE/IBAN: ${sender.bankClabe}` : null,
          sender.bankSwift ? `SWIFT/BIC: ${sender.bankSwift}` : null,
          `Referencia: ${sender.bankReference || quote.folio}`,
        ].filter(Boolean) as string[];
        for (const line of bankLines) {
          doc.text(line, margin, y);
          y += 4.5;
        }
        y += 5;
      }

      // ── Notas y términos ──────────────────────────────────────────────
      const printBlock = (title: string, text: string) => {
        const lines = doc.splitTextToSize(text, contentW);
        newPageIfNeeded(lines.length * 4.2 + 12);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text(lines, margin, y);
        y += lines.length * 4.2 + 8;
      };
      if (quote.notes) printBlock("Notas", quote.notes);
      if (quote.terms) printBlock("Términos y condiciones", quote.terms);

      // ── Footer ────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(30, 30, 30);
        doc.rect(0, pageH - 12, pageW, 12, "F");
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${businessName} · Cotización ${quote.folio} · Página ${i} de ${pageCount}`,
          pageW / 2,
          pageH - 5,
          { align: "center" }
        );
      }

      doc.save(`cotizacion-${quote.folio}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-text-primary rounded-lg hover:bg-nav-hover transition-colors disabled:opacity-50"
    >
      <HugeiconsIcon icon={Download01Icon} size={15} />
      {loading ? "Generando…" : "PDF"}
    </button>
  );
}
