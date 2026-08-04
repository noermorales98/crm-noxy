"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon, PencilEdit01Icon, Delete01Icon, Link01Icon, DollarCircleIcon,
  CheckmarkCircle01Icon, ArrowLeft01Icon, Invoice01Icon,
} from "@hugeicons/core-free-icons";
import QuotePdfButton from "@/src/components/quotes/QuotePdfButton";
import { QuoteStatusBadge, formatQuoteMoney } from "@/src/components/quotes/shared";

const EVENT_LABELS: Record<string, string> = {
  CREADA: "Creada",
  EDITADA: "Editada",
  ENVIADA: "Enviada",
  VISTA: "Vista por el cliente",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  PAGO_STRIPE: "Pago con Stripe",
  COMPROBANTE_SUBIDO: "Comprobante recibido",
  PAGO_CONFIRMADO: "Pago confirmado",
  VENCIDA: "Vencida",
  NOTA: "Nota",
};

function QuoteDetailContent() {
  const params = useParams();
  const folio = params.folio as string;
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState } = useHeader();

  const [quote, setQuote] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(`/api/quotes/${encodeURIComponent(folio)}`),
        fetch("/api/quote-settings"),
      ]);
      if (qRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (qRes.ok) setQuote(await qRes.json());
      if (sRes.ok) setSettings(await sRes.json());
    } catch {
      addToast("Error al cargar la cotización", "error");
    } finally {
      setLoading(false);
    }
  }, [folio, addToast]);

  useEffect(() => {
    resetState();
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setConfig({ title: quote ? `Cotización ${quote.folio}` : "Cotización" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.folio]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = () =>
    runAction("send", async () => {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Error al enviar", "error");
      addToast(
        data.emailSent
          ? `Cotización enviada a ${quote.clientEmail}${data.viaCompany ? " (SMTP de la empresa)" : ""}.`
          : "Marcada como enviada, pero el correo no pudo enviarse. Revisa el SMTP de la empresa remitente (sección Empresas) o las variables SMTP del entorno.",
        data.emailSent ? "success" : "info"
      );
      fetchQuote();
    });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/cotizar/${quote.publicToken}`;
    navigator.clipboard
      .writeText(url)
      .then(() => addToast("Link público copiado al portapapeles.", "success"))
      .catch(() => addToast(url, "info"));
  };

  const handleStripe = () =>
    runAction("stripe", async () => {
      const res = await fetch(`/api/quotes/${quote.id}/stripe`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Error generando link de Stripe", "error");
      await navigator.clipboard.writeText(data.url).catch(() => {});
      addToast("Link de pago de Stripe generado y copiado.", "success");
      fetchQuote();
    });

  const handleMarkPaid = () =>
    runAction("pago", async () => {
      const ok = await confirm({
        title: "Registrar pago",
        description: `¿Confirmar el pago de ${formatQuoteMoney(quote.total, quote.currency)} para ${quote.folio}?`,
        confirmText: "Confirmar pago",
        cancelText: "Cancelar",
      });
      if (!ok) return;
      const res = await fetch(`/api/quotes/${quote.id}/pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Error al registrar el pago", "error");
      addToast("Pago registrado. Cotización marcada como pagada.", "success");
      fetchQuote();
    });

  const handleDelete = () =>
    runAction("delete", async () => {
      const isPaid = quote.status === "PAGADA";
      const ok = await confirm({
        title: isPaid ? "Eliminar cotización pagada" : "Eliminar cotización",
        description: isPaid
          ? `${quote.folio} está marcada como PAGADA (${formatQuoteMoney(quote.total, quote.currency)}). ¿Seguro que quieres eliminarla? Esta acción no se puede deshacer.`
          : `¿Eliminar ${quote.folio}? Esta acción no se puede deshacer.`,
        confirmText: isPaid ? "Sí, eliminar pagada" : "Eliminar",
        cancelText: "Cancelar",
        variant: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/quotes/${quote.id}${isPaid ? "?force=true" : ""}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Error al eliminar", "error");
      addToast("Cotización eliminada.", "success");
      router.push("/cotizaciones");
    });

  if (loading) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (notFound || !quote) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
        <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
          <HugeiconsIcon icon={Invoice01Icon} size={28} color="#9ca3af" className="mx-auto mb-3" />
          <h3 className="text-base font-semibold text-text-primary mb-1">Cotización no encontrada</h3>
          <Link href="/cotizaciones" className="text-sm text-blue-600 hover:underline">
            Volver al listado
          </Link>
        </div>
      </main>
    );
  }

  const canEdit = quote.status === "BORRADOR";
  const canSend = ["BORRADOR", "ENVIADA", "ACEPTADA"].includes(quote.status);
  const canPay = ["ENVIADA", "ACEPTADA"].includes(quote.status);

  // Remitente: empresa del CRM si hay, si no los datos manuales de configuración
  const senderName = quote.senderCompany?.name || settings?.businessName || null;
  const pdfSender = {
    ...(settings || {}),
    businessName: senderName,
    website: settings?.website || quote.senderCompany?.website || null,
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/cotizaciones"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Cotizaciones
        </Link>

        {/* ── Encabezado + acciones ─────────────────────────────────────── */}
        <div className="bg-white border border-border-subtle rounded-lg p-6 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-text-primary">{quote.folio}</h1>
                <QuoteStatusBadge status={quote.status} />
              </div>
              <p className="text-sm text-text-secondary">
                {quote.clientName}
                {quote.clientCompany ? ` · ${quote.clientCompany}` : ""}
              </p>
              {senderName && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Remitente: <span className="font-medium text-text-primary">{senderName}</span>
                  {quote.senderCompany && !quote.senderCompany.smtpHost && (
                    <span className="text-amber-600"> (sin SMTP)</span>
                  )}
                </p>
              )}
              <p className="text-xs text-text-secondary mt-1">
                Emitida {new Date(quote.issuedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                {quote.validUntil &&
                  ` · Vigente hasta ${new Date(quote.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary">{formatQuoteMoney(quote.total, quote.currency)}</p>
              <p className="text-xs text-text-secondary">
                Subtotal {formatQuoteMoney(quote.subtotal, quote.currency)} + impuestos {formatQuoteMoney(quote.taxAmount, quote.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-4 border-t border-border-subtle">
            {canEdit && (
              <Link
                href={`/cotizaciones/nueva?edit=${quote.id}`}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-text-primary rounded-lg hover:bg-nav-hover transition-colors"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                Editar
              </Link>
            )}
            {canSend && (
              <button
                onClick={handleSend}
                disabled={actionLoading === "send"}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-text-primary rounded-lg hover:bg-nav-hover transition-colors disabled:opacity-50"
              >
                <HugeiconsIcon icon={SentIcon} size={15} />
                {actionLoading === "send" ? "Enviando…" : quote.status === "BORRADOR" ? "Enviar al cliente" : "Reenviar"}
              </button>
            )}
            <QuotePdfButton quote={quote} sender={pdfSender} />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-text-primary rounded-lg hover:bg-nav-hover transition-colors"
            >
              <HugeiconsIcon icon={Link01Icon} size={15} />
              Copiar link público
            </button>
            {quote.stripePaymentLinkUrl ? (
              <a
                href={quote.stripePaymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-violet-700 rounded-lg hover:bg-violet-50 transition-colors"
              >
                <HugeiconsIcon icon={DollarCircleIcon} size={15} color="#7c3aed" />
                Link de Stripe
              </a>
            ) : (
              canPay && (
                <button
                  onClick={handleStripe}
                  disabled={actionLoading === "stripe"}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-text-primary rounded-lg hover:bg-nav-hover transition-colors disabled:opacity-50"
                >
                  <HugeiconsIcon icon={DollarCircleIcon} size={15} />
                  {actionLoading === "stripe" ? "Generando…" : "Generar link Stripe"}
                </button>
              )
            )}
            {canPay && (
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading === "pago"}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} color="white" />
                Registrar pago
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="ml-auto flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <HugeiconsIcon icon={Delete01Icon} size={15} color="#ef4444" />
              Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          {/* ── Ítems y condiciones ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sidebar/60">
                    <th className="px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Descripción</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-center">Cant.</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">P. unit.</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Desc.</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quote.items.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-5 py-3.5 text-text-primary">{it.description}</td>
                      <td className="px-5 py-3.5 text-center text-text-secondary">{it.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">{formatQuoteMoney(it.unitPrice, quote.currency)}</td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">{it.discount > 0 ? `${it.discount}%` : "—"}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-text-primary">{formatQuoteMoney(it.total, quote.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-border-subtle flex flex-col items-end gap-1 text-sm">
                <p className="text-text-secondary">Subtotal: <span className="font-medium text-text-primary">{formatQuoteMoney(quote.subtotal, quote.currency)}</span></p>
                <p className="text-text-secondary">Impuestos ({quote.taxRate}%): <span className="font-medium text-text-primary">{formatQuoteMoney(quote.taxAmount, quote.currency)}</span></p>
                <p className="text-base font-bold text-text-primary pt-1">Total: {formatQuoteMoney(quote.total, quote.currency)}</p>
              </div>
            </div>

            {(quote.notes || quote.terms) && (
              <div className="bg-white border border-border-subtle rounded-lg p-5 flex flex-col gap-4">
                {quote.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1.5">Notas</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-1.5">Términos y condiciones</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{quote.terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Datos del cliente */}
            <div className="bg-white border border-border-subtle rounded-lg p-5">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-2">Cliente</p>
              <p className="text-sm font-semibold text-text-primary">{quote.clientName}</p>
              {quote.clientCompany && <p className="text-sm text-text-secondary">{quote.clientCompany}</p>}
              {quote.clientEmail && <p className="text-sm text-text-secondary">{quote.clientEmail}</p>}
              {quote.clientPhone && <p className="text-sm text-text-secondary">{quote.clientPhone}</p>}
              {quote.clientAddress && <p className="text-sm text-text-secondary">{quote.clientAddress}</p>}
              {quote.contact && (
                <Link href="/contacts" className="inline-block mt-2 text-xs text-blue-600 hover:underline">
                  Vinculado al contacto {quote.contact.firstName} {quote.contact.lastName || ""}
                </Link>
              )}
            </div>
          </div>

          {/* ── Historial ───────────────────────────────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-lg p-5">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-4">
              Historial
            </p>
            {quote.events.length === 0 ? (
              <p className="text-sm text-text-secondary italic">Sin eventos</p>
            ) : (
              <div className="flex flex-col">
                {quote.events.map((ev: any, i: number) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                          ev.actor === "cliente" ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                      {i < quote.events.length - 1 && <span className="flex-1 w-px bg-gray-100" />}
                    </div>
                    <div className="pb-5 min-w-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {EVENT_LABELS[ev.type] ?? ev.type}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-text-secondary mt-0.5 break-words">{ev.description}</p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">
                        {new Date(ev.createdAt).toLocaleString("es-MX", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function QuoteDetailPage() {
  return <QuoteDetailContent />;
}
