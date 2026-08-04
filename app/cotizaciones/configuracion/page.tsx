"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, BankIcon, Building04Icon, Settings01Icon, DollarCircleIcon } from "@hugeicons/core-free-icons";
import { input as inputCls, btnPrimary } from "@/src/lib/crm-ui";

const EMPTY = {
  businessName: "", logoUrl: "", taxId: "", address: "", phone: "", email: "", website: "",
  bankName: "", bankBeneficiary: "", bankClabe: "", bankReference: "",
  defaultTaxRate: "16", defaultCurrency: "MXN", defaultTerms: "", defaultSenderCompanyId: "",
};

function ConfiguracionContent() {
  const { addToast } = useToast();
  const { setConfig, resetState } = useHeader();
  const [form, setForm] = useState(EMPTY);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Claves de Stripe (nunca se muestran completas)
  const [stripeSecretMasked, setStripeSecretMasked] = useState<string | null>(null);
  const [stripeWebhookMasked, setStripeWebhookMasked] = useState<string | null>(null);
  const [stripeSecretInput, setStripeSecretInput] = useState("");
  const [stripeWebhookInput, setStripeWebhookInput] = useState("");
  const [clearStripeSecret, setClearStripeSecret] = useState(false);
  const [clearStripeWebhook, setClearStripeWebhook] = useState(false);

  useEffect(() => {
    resetState();
    setConfig({ title: "Configuración de cotizaciones" });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCompanies)
      .catch(() => {});
    fetch("/api/quote-settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: any) => {
        setForm({
          businessName: s.businessName || "",
          logoUrl: s.logoUrl || "",
          taxId: s.taxId || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          website: s.website || "",
          bankName: s.bankName || "",
          bankBeneficiary: s.bankBeneficiary || "",
          bankClabe: s.bankClabe || "",
          bankReference: s.bankReference || "",
          defaultTaxRate: String(s.defaultTaxRate ?? 16),
          defaultCurrency: s.defaultCurrency || "MXN",
          defaultTerms: s.defaultTerms || "",
          defaultSenderCompanyId: s.defaultSenderCompanyId || "",
        });
        setStripeSecretMasked(s.stripeSecretKeyMasked || null);
        setStripeWebhookMasked(s.stripeWebhookSecretMasked || null);
      })
      .catch(() => addToast("Error al cargar la configuración", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        defaultTaxRate: parseFloat(form.defaultTaxRate) || 0,
      };
      // Claves de Stripe: omitido = conservar; solo enviar si hay cambios
      if (clearStripeSecret) payload.stripeSecretKey = null;
      else if (stripeSecretInput.trim()) payload.stripeSecretKey = stripeSecretInput.trim();
      if (clearStripeWebhook) payload.stripeWebhookSecret = null;
      else if (stripeWebhookInput.trim()) payload.stripeWebhookSecret = stripeWebhookInput.trim();

      const res = await fetch("/api/quote-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      // Refrescar las máscaras y limpiar los inputs
      const refresh = await fetch("/api/quote-settings");
      if (refresh.ok) {
        const s = await refresh.json();
        setStripeSecretMasked(s.stripeSecretKeyMasked || null);
        setStripeWebhookMasked(s.stripeWebhookSecretMasked || null);
      }
      setStripeSecretInput("");
      setStripeWebhookInput("");
      setClearStripeSecret(false);
      setClearStripeWebhook(false);
      addToast("Configuración guardada.", "success");
    } catch (err: any) {
      addToast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof EMPTY, opts?: { placeholder?: string; type?: string; span?: boolean }) => (
    <div className={`flex flex-col gap-1.5 ${opts?.span ? "md:col-span-2" : ""}`}>
      <label className="text-xs font-semibold text-text-secondary">{label}</label>
      <input
        type={opts?.type || "text"}
        value={form[key]}
        onChange={set(key)}
        placeholder={opts?.placeholder}
        className={inputCls}
      />
    </div>
  );

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/cotizaciones"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Cotizaciones
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Datos fiscales */}
            <section className="bg-white border border-border-subtle rounded-lg p-6">
              <div className="flex items-center gap-2 mb-1">
                <HugeiconsIcon icon={Building04Icon} size={16} color="#37352F" />
                <h2 className="text-sm font-bold text-text-primary">Empresa remitente</h2>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                La remitente siempre es una de tus empresas del CRM (los correos se envían desde su SMTP).
                Es opcional: si no eliges una, se usan los datos manuales de abajo. Puedes alternarla en cada cotización.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">Empresa remitente por defecto (opcional)</label>
                  <select value={form.defaultSenderCompanyId} onChange={set("defaultSenderCompanyId")} className={inputCls}>
                    <option value="">— Sin empresa por defecto —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.smtpHost ? "" : " (sin SMTP)"}
                      </option>
                    ))}
                  </select>
                  {form.defaultSenderCompanyId && !companies.find((c) => c.id === form.defaultSenderCompanyId)?.smtpHost && (
                    <p className="text-xs text-amber-600">
                      Esta empresa no tiene SMTP configurado. Configúralo en la sección Empresas para poder enviar correos desde ella.
                    </p>
                  )}
                </div>
                {field("Nombre / Razón social", "businessName")}
                {field("RFC o identificador fiscal", "taxId")}
                {field("Logo (URL de imagen)", "logoUrl", { placeholder: "https://…/logo.png", span: true })}
                {form.logoUrl && (
                  <div className="md:col-span-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logoUrl} alt="Logo" className="h-12 max-w-[180px] object-contain rounded border border-border-subtle bg-white p-1" />
                  </div>
                )}
                {field("Dirección", "address", { span: true })}
                {field("Teléfono", "phone", { type: "tel" })}
                {field("Correo", "email", { type: "email" })}
                {field("Sitio web", "website", { placeholder: "https://…" })}
              </div>
            </section>

            {/* Datos bancarios */}
            <section className="bg-white border border-border-subtle rounded-lg p-6">
              <div className="flex items-center gap-2 mb-1">
                <HugeiconsIcon icon={BankIcon} size={16} color="#37352F" />
                <h2 className="text-sm font-bold text-text-primary">Datos bancarios para transferencia</h2>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Se muestran al cliente en la vista pública cuando elige pagar por transferencia.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("Banco", "bankName")}
                {field("Beneficiario", "bankBeneficiary")}
                {field("CLABE / IBAN", "bankClabe")}
                {field("Referencia por defecto", "bankReference", { placeholder: "Si se deja vacío se usa el folio" })}
              </div>
            </section>

            {/* Defaults */}
            <section className="bg-white border border-border-subtle rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <HugeiconsIcon icon={Settings01Icon} size={16} color="#37352F" />
                <h2 className="text-sm font-bold text-text-primary">Valores por defecto</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Impuesto por defecto (%)</label>
                  <input type="number" min="0" max="100" step="any" value={form.defaultTaxRate} onChange={set("defaultTaxRate")} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Moneda por defecto</label>
                  <select value={form.defaultCurrency} onChange={set("defaultCurrency")} className={inputCls}>
                    <option value="MXN">MXN — Peso mexicano</option>
                    <option value="USD">USD — Dólar estadounidense</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">Términos y condiciones por defecto</label>
                  <textarea value={form.defaultTerms} onChange={set("defaultTerms")} rows={4} className={inputCls} placeholder="Se precargan en cada nueva cotización…" />
                </div>
              </div>
            </section>

            {/* Stripe */}
            <section className="bg-white border border-border-subtle rounded-lg p-6">
              <div className="flex items-center gap-2 mb-1">
                <HugeiconsIcon icon={DollarCircleIcon} size={16} color="#37352F" />
                <h2 className="text-sm font-bold text-text-primary">Cobro con Stripe</h2>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Usa primero tus claves de <strong>modo test</strong> (<code>sk_test_…</code>). Se guardan en la base de datos
                y nunca se muestran completas. El webhook debe apuntar a{" "}
                <code>{typeof window !== "undefined" ? window.location.origin : "https://tu-dominio"}/api/webhooks/stripe</code>{" "}
                con el evento <code>checkout.session.completed</code>.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {/* Clave secreta */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Clave secreta (Secret key)</label>
                  {clearStripeSecret ? (
                    <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5">
                      <span className="text-sm text-red-600">La clave secreta se eliminará al guardar.</span>
                      <button type="button" onClick={() => setClearStripeSecret(false)} className="text-xs font-medium text-text-secondary hover:text-text-primary">
                        Deshacer
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={stripeSecretInput}
                        onChange={(e) => setStripeSecretInput(e.target.value)}
                        placeholder={stripeSecretMasked ? `Guardada: ${stripeSecretMasked} — escribe para reemplazar` : "sk_test_…"}
                        className={inputCls}
                      />
                      {stripeSecretMasked && (
                        <button
                          type="button"
                          onClick={() => setClearStripeSecret(true)}
                          className="shrink-0 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Webhook secret */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Secreto del webhook (Signing secret)</label>
                  {clearStripeWebhook ? (
                    <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5">
                      <span className="text-sm text-red-600">El secreto del webhook se eliminará al guardar.</span>
                      <button type="button" onClick={() => setClearStripeWebhook(false)} className="text-xs font-medium text-text-secondary hover:text-text-primary">
                        Deshacer
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={stripeWebhookInput}
                        onChange={(e) => setStripeWebhookInput(e.target.value)}
                        placeholder={stripeWebhookMasked ? `Guardado: ${stripeWebhookMasked} — escribe para reemplazar` : "whsec_…"}
                        className={inputCls}
                      />
                      {stripeWebhookMasked && (
                        <button
                          type="button"
                          onClick={() => setClearStripeWebhook(true)}
                          className="shrink-0 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-secondary mt-3">
                Sin clave secreta, el cobro con tarjeta se desactiva y las cotizaciones se pagan por transferencia.
                Si estos campos están vacíos se usan las variables de entorno <code>STRIPE_SECRET_KEY</code> y{" "}
                <code>STRIPE_WEBHOOK_SECRET</code> como respaldo.
              </p>
            </section>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Guardando…" : "Guardar configuración"}
              </button>
            </div>

            <p className="text-xs text-text-secondary bg-surface-sidebar rounded-lg p-4">
              <strong>Correos:</strong> se envían desde el SMTP de la empresa remitente (configúralo en la sección Empresas).
              Si la cotización no tiene empresa, se usan las variables <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,
              <code> SMTP_USER</code>, <code>SMTP_PASS</code> y <code>SMTP_FROM_EMAIL</code> del entorno como respaldo.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ConfiguracionPage() {
  return <ConfiguracionContent />;
}
