"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface PublicQuote {
  folio: string;
  status: string;
  currency: string;
  issuedAt: string;
  validUntil: string | null;
  clientName: string;
  clientCompany: string | null;
  items: { id: string; description: string; quantity: number; unitPrice: number; discount: number; total: number }[];
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  stripePaymentLinkUrl: string | null;
  paidAt: string | null;
  sender: {
    businessName: string | null;
    logoUrl: string | null;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
}

interface BankData {
  bankName: string | null;
  bankBeneficiary: string | null;
  bankClabe: string | null;
  bankReference: string | null;
}

function CotizarContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const justPaid = searchParams.get("pagado") === "1";

  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [bank, setBank] = useState<BankData | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState("");
  const [receiptSent, setReceiptSent] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/quotes/${token}`);
      if (res.status === 404) return setStatus("notfound");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote(data);
      if (data.stripePaymentLinkUrl) setStripeUrl(data.stripePaymentLinkUrl);
      if (data.bank) setBank(data.bank);
      setStatus("ready");
    } catch {
      setStatus("notfound");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Si regresa de Stripe (?pagado=1), reconsultar unas veces esperando el webhook
  useEffect(() => {
    if (!justPaid || !quote || quote.status === "PAGADA") return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      load();
      if (attempts >= 6) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [justPaid, quote, load]);

  const money = (n: number) => {
    try {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: quote!.currency }).format(n);
    } catch {
      return `${quote!.currency} ${n.toFixed(2)}`;
    }
  };

  const handleAccept = async () => {
    setActionLoading("accept");
    setError(null);
    try {
      const res = await fetch(`/api/public/quotes/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo aceptar la cotización");
        if (data.status) setQuote((q) => (q ? { ...q, status: data.status } : q));
        return;
      }
      setStripeUrl(data.stripeUrl || null);
      setBank(data.bank || null);
      if (data.stripeError && !data.stripeUrl) setError(null); // transferencia disponible
      await load();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading("reject");
    setError(null);
    try {
      const res = await fetch(`/api/public/quotes/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || null }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "No se pudo rechazar");
      await load();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setActionLoading(null);
      setShowReject(false);
    }
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt.trim()) return;
    setActionLoading("receipt");
    setError(null);
    try {
      const res = await fetch(`/api/public/quotes/${token}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: receipt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "No se pudo enviar el comprobante");
      setReceiptSent(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "notfound" || !quote) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center max-w-md w-full">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Cotización no encontrada</h1>
          <p className="text-sm text-gray-500">El enlace no es válido o la cotización fue eliminada.</p>
        </div>
      </div>
    );
  }

  const senderName = quote.sender.businessName || "Noxy CRM";
  const canRespond = quote.status === "ENVIADA";
  const isAccepted = quote.status === "ACEPTADA";

  return (
    <div className="min-h-screen bg-[#f7f6f3] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ── Encabezado con branding ────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          {quote.sender.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quote.sender.logoUrl} alt={senderName} className="h-12 max-w-[160px] object-contain" />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{senderName}</p>
            <p className="text-xs text-gray-500">
              {[quote.sender.taxId && `RFC: ${quote.sender.taxId}`, quote.sender.email, quote.sender.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {/* ── Banners de estado ──────────────────────────────────────────── */}
        {quote.status === "PAGADA" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-green-700 font-semibold">Cotización pagada</p>
            <p className="text-green-600 text-sm">
              Gracias, {quote.clientName}. Tu pago fue confirmado
              {quote.paidAt ? ` el ${new Date(quote.paidAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}` : ""}.
            </p>
          </div>
        )}
        {quote.status === "VENCIDA" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-red-600 font-semibold">Esta cotización está vencida</p>
            <p className="text-red-500 text-sm">
              La vigencia terminó{quote.validUntil ? ` el ${new Date(quote.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}` : ""}.
              Contacta a {senderName} para una nueva cotización.
            </p>
          </div>
        )}
        {quote.status === "RECHAZADA" && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-rose-600 font-semibold">Cotización rechazada</p>
            <p className="text-rose-500 text-sm">Esta cotización ya no está disponible.</p>
          </div>
        )}
        {quote.status === "BORRADOR" && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-gray-600 font-semibold">Cotización en preparación</p>
            <p className="text-gray-500 text-sm">Esta cotización aún no ha sido enviada formalmente. Vuelve pronto o contacta a {senderName}.</p>
          </div>
        )}
        {justPaid && quote.status !== "PAGADA" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-blue-700 font-semibold">Verificando tu pago…</p>
            <p className="text-blue-600 text-sm">Estamos confirmando el pago con Stripe. Esto puede tardar unos segundos.</p>
          </div>
        )}

        {/* ── Documento ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Cotización</p>
              <h1 className="text-xl font-bold text-gray-900">{quote.folio}</h1>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Emitida: {new Date(quote.issuedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
              {quote.validUntil && (
                <p>Vigente hasta: {new Date(quote.validUntil).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Para</p>
            <p className="font-semibold text-gray-900">{quote.clientName}</p>
            {quote.clientCompany && <p className="text-sm text-gray-500">{quote.clientCompany}</p>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Descripción</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Cant.</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">P. unit.</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Desc.</th>
                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-6 py-3.5 text-gray-900">{it.description}</td>
                  <td className="px-3 py-3.5 text-center text-gray-500">{it.quantity}</td>
                  <td className="px-3 py-3.5 text-right text-gray-500">{money(it.unitPrice)}</td>
                  <td className="px-3 py-3.5 text-right text-gray-500">{it.discount > 0 ? `-${it.discount}%` : "—"}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-gray-900">{money(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 border-t border-gray-100 flex flex-col items-end gap-1 text-sm">
            <p className="text-gray-500">Subtotal: <span className="text-gray-900 font-medium">{money(quote.subtotal)}</span></p>
            <p className="text-gray-500">Impuestos ({quote.taxRate}%): <span className="text-gray-900 font-medium">{money(quote.taxAmount)}</span></p>
            <p className="text-lg font-bold text-gray-900 pt-1">Total: {money(quote.total)}</p>
          </div>

          {(quote.notes || quote.terms) && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-3">
              {quote.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Notas</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Términos y condiciones</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">{error}</div>
        )}

        {/* ── Acciones del cliente ───────────────────────────────────────── */}
        {canRespond && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="font-semibold text-gray-900 mb-1">¿Aceptas esta cotización?</p>
            <p className="text-sm text-gray-500 mb-4">
              Al aceptar podrás pagar en línea con tarjeta o por transferencia bancaria.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAccept}
                disabled={actionLoading === "accept"}
                className="flex-1 min-w-[180px] bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {actionLoading === "accept" ? "Procesando…" : "Aceptar cotización"}
              </button>
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  className="py-3 px-6 rounded-lg font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Rechazar
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2 mt-1">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Motivo (opcional)…"
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={actionLoading === "reject"}
                      className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === "reject" ? "Enviando…" : "Confirmar rechazo"}
                    </button>
                    <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="flex flex-col gap-4">
            {/* Pago con tarjeta */}
            {stripeUrl && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="font-semibold text-gray-900 mb-1">Pagar con tarjeta</p>
                <p className="text-sm text-gray-500 mb-4">Pago seguro procesado por Stripe por {money(quote.total)}.</p>
                <a
                  href={stripeUrl}
                  className="block w-full text-center bg-violet-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
                >
                  Pagar {money(quote.total)} con Stripe
                </a>
              </div>
            )}

            {/* Transferencia */}
            {bank && (bank.bankClabe || bank.bankName) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="font-semibold text-gray-900 mb-3">Pagar por transferencia</p>
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm mb-5">
                  {bank.bankName && (<><dt className="text-gray-400">Banco</dt><dd className="text-gray-900 font-medium">{bank.bankName}</dd></>)}
                  {bank.bankBeneficiary && (<><dt className="text-gray-400">Beneficiario</dt><dd className="text-gray-900 font-medium">{bank.bankBeneficiary}</dd></>)}
                  {bank.bankClabe && (<><dt className="text-gray-400">CLABE/IBAN</dt><dd className="text-gray-900 font-medium font-mono">{bank.bankClabe}</dd></>)}
                  {bank.bankReference && (<><dt className="text-gray-400">Referencia</dt><dd className="text-gray-900 font-medium font-mono">{bank.bankReference}</dd></>)}
                  <dt className="text-gray-400">Monto</dt><dd className="text-gray-900 font-bold">{money(quote.total)}</dd>
                </dl>

                {receiptSent ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    Comprobante recibido. Te notificaremos cuando el pago sea confirmado.
                  </p>
                ) : (
                  <form onSubmit={handleReceipt} className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500">
                      ¿Ya pagaste? Reporta tu comprobante
                    </label>
                    <textarea
                      value={receipt}
                      onChange={(e) => setReceipt(e.target.value)}
                      rows={2}
                      placeholder="Referencia, fecha y hora de la transferencia, últimos dígitos…"
                      className="w-full px-3 py-2.5 rounded-lg bg-gray-50 text-sm outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading === "receipt" || !receipt.trim()}
                      className="self-end px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === "receipt" ? "Enviando…" : "Enviar comprobante"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {!stripeUrl && !(bank && (bank.bankClabe || bank.bankName)) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="font-semibold text-gray-900 mb-1">Cotización aceptada</p>
                <p className="text-sm text-gray-500">
                  {senderName} se pondrá en contacto contigo para coordinar el pago.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Pie ────────────────────────────────────────────────────────── */}
        <div className="text-center mt-8 text-xs text-gray-400">
          {quote.sender.address && <p>{quote.sender.address}</p>}
          {quote.sender.website && (
            <a href={quote.sender.website} target="_blank" rel="noreferrer" className="hover:underline">
              {quote.sender.website}
            </a>
          )}
          <p className="mt-2">Generado con Noxy CRM</p>
        </div>
      </div>
    </div>
  );
}

export default function CotizarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      }
    >
      <CotizarContent />
    </Suspense>
  );
}
