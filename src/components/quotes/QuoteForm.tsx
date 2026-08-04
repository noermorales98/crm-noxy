"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls, btnPrimary } from "@/src/lib/crm-ui";

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

interface QuoteFormProps {
  mode: "create" | "edit";
  quoteId?: string;
}

const emptyItem: ItemRow = { description: "", quantity: "1", unitPrice: "", discount: "0" };

export default function QuoteForm({ mode, quoteId }: QuoteFormProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [senderCompanyId, setSenderCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [currency, setCurrency] = useState("MXN");
  const [validUntil, setValidUntil] = useState("");
  const [taxRate, setTaxRate] = useState("16");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  // Catálogo de contactos y empresas (remitentes) del CRM
  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => (r.ok ? r.json() : []))
      .then(setContacts)
      .catch(() => {});
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCompanies)
      .catch(() => {});
  }, []);

  // Defaults desde la configuración (solo en creación)
  useEffect(() => {
    if (mode !== "create") return;
    fetch("/api/quote-settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: any) => {
        if (s.defaultCurrency) setCurrency(s.defaultCurrency);
        if (s.defaultTaxRate != null) setTaxRate(String(s.defaultTaxRate));
        if (s.defaultTerms) setTerms(s.defaultTerms);
        if (s.defaultSenderCompanyId) setSenderCompanyId(s.defaultSenderCompanyId);
      })
      .catch(() => {});
  }, [mode]);

  // Cargar cotización en modo edición
  useEffect(() => {
    if (mode !== "edit" || !quoteId) return;
    fetch(`/api/quotes/${quoteId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Error");
        return r.json();
      })
      .then((q) => {
        setContactId(q.contactId || "");
        setSenderCompanyId(q.senderCompanyId || "");
        setClientName(q.clientName || "");
        setClientCompany(q.clientCompany || "");
        setClientEmail(q.clientEmail || "");
        setClientPhone(q.clientPhone || "");
        setClientAddress(q.clientAddress || "");
        setCurrency(q.currency || "MXN");
        setValidUntil(q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : "");
        setTaxRate(String(q.taxRate ?? 16));
        setNotes(q.notes || "");
        setTerms(q.terms || "");
        setItems(
          (q.items || []).map((it: any) => ({
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            discount: String(it.discount ?? 0),
          }))
        );
      })
      .catch((err) => addToast(err.message || "No se pudo cargar la cotización", "error"))
      .finally(() => setLoading(false));
  }, [mode, quoteId, addToast]);

  const pickContact = (id: string) => {
    setContactId(id);
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      setClientName(`${contact.firstName}${contact.lastName ? " " + contact.lastName : ""}`);
      setClientCompany(contact.company?.name || "");
      setClientEmail(contact.email || "");
      setClientPhone(contact.phone || "");
    }
  };

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const totals = useMemo(() => {
    const parsed = items.map((it) => {
      const quantity = parseFloat(it.quantity) || 0;
      const unitPrice = parseFloat(it.unitPrice) || 0;
      const discount = Math.min(100, Math.max(0, parseFloat(it.discount) || 0));
      return quantity * unitPrice * (1 - discount / 100);
    });
    const subtotal = parsed.reduce((a, b) => a + b, 0);
    const rate = parseFloat(taxRate) || 0;
    const taxAmount = subtotal * (rate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [items, taxRate]);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

  const itemTotal = (it: ItemRow) => {
    const quantity = parseFloat(it.quantity) || 0;
    const unitPrice = parseFloat(it.unitPrice) || 0;
    const discount = Math.min(100, Math.max(0, parseFloat(it.discount) || 0));
    return quantity * unitPrice * (1 - discount / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return addToast("El nombre del cliente es requerido", "error");
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) return addToast("Agrega al menos un ítem con descripción", "error");
    if (validItems.some((it) => !it.unitPrice || isNaN(parseFloat(it.unitPrice)))) {
      return addToast("Todos los ítems necesitan un precio unitario", "error");
    }

    setSaving(true);
    try {
      const payload = {
        contactId: contactId || null,
        senderCompanyId: senderCompanyId || null,
        clientName: clientName.trim(),
        clientCompany: clientCompany || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        currency,
        validUntil: validUntil || null,
        taxRate: parseFloat(taxRate) || 0,
        notes: notes || null,
        terms: terms || null,
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          discount: parseFloat(it.discount) || 0,
        })),
      };

      const res = await fetch(mode === "edit" ? `/api/quotes/${quoteId}` : "/api/quotes", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      addToast(mode === "edit" ? "Cotización actualizada." : `Cotización ${data.folio} creada.`, "success");
      router.push(`/cotizaciones/${data.folio}`);
    } catch (err: any) {
      addToast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* ── Remitente ───────────────────────────────────────────────────── */}
      <section className="bg-white border border-border-subtle rounded-lg p-6">
        <h2 className="text-sm font-bold text-text-primary mb-1">Remitente</h2>
        <p className="text-xs text-text-secondary mb-4">
          La empresa que emite la cotización y desde cuyo correo se envía. Opcional: si no eliges una, se usan los datos manuales de la configuración.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Empresa remitente (opcional)</label>
          <select value={senderCompanyId} onChange={(e) => setSenderCompanyId(e.target.value)} className={inputCls}>
            <option value="">— Sin empresa (datos manuales de configuración) —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.smtpHost ? "" : " (sin SMTP)"}
              </option>
            ))}
          </select>
          {senderCompanyId && !companies.find((c) => c.id === senderCompanyId)?.smtpHost && (
            <p className="text-xs text-amber-600 mt-1">
              Esta empresa no tiene SMTP configurado; el correo se intentará con el SMTP global. Configúralo en la sección Empresas.
            </p>
          )}
        </div>
      </section>

      {/* ── Cliente ─────────────────────────────────────────────────────── */}
      <section className="bg-white border border-border-subtle rounded-lg p-6">
        <h2 className="text-sm font-bold text-text-primary mb-4">Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-text-secondary">Contacto existente del CRM</label>
            <select value={contactId} onChange={(e) => pickContact(e.target.value)} className={inputCls}>
              <option value="">— Capturar cliente nuevo —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName || ""}{c.company?.name ? ` · ${c.company.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Nombre *</label>
            <input required type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Empresa</label>
            <input type="text" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Correo</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} placeholder="cliente@empresa.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Teléfono</label>
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-text-secondary">Dirección fiscal</label>
            <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      {/* ── Ítems ───────────────────────────────────────────────────────── */}
      <section className="bg-white border border-border-subtle rounded-lg p-6">
        <h2 className="text-sm font-bold text-text-primary mb-4">Ítems</h2>
        <div className="hidden md:grid grid-cols-[1fr_90px_130px_110px_120px_36px] gap-2 mb-2">
          {["Descripción", "Cantidad", "Precio unit.", "Desc. %", "Total", ""].map((h) => (
            <p key={h} className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">{h}</p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_90px_130px_110px_120px_36px] gap-2 items-center">
              <input
                type="text"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder={`Descripción del ítem ${i + 1}`}
                className={inputCls}
              />
              <input
                type="number" min="0" step="any"
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
                className={inputCls}
              />
              <input
                type="number" min="0" step="any"
                value={it.unitPrice}
                onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                placeholder="0.00"
                className={inputCls}
              />
              <input
                type="number" min="0" max="100" step="any"
                value={it.discount}
                onChange={(e) => updateItem(i, { discount: e.target.value })}
                className={inputCls}
              />
              <p className="text-sm font-semibold text-text-primary text-right md:text-left px-1">
                {fmt(itemTotal(it))}
              </p>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors justify-self-end"
                title="Quitar ítem"
              >
                <HugeiconsIcon icon={Delete01Icon} size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg hover:bg-nav-hover transition-colors"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} />
          Agregar ítem
        </button>

        {/* Totales */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-medium w-32 text-right">{fmt(totals.subtotal)}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-text-secondary flex items-center gap-2">
              Impuestos
              <input
                type="number" min="0" max="100" step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className={`${inputCls} !w-20 !py-1 text-right`}
                title="Tasa de impuesto (%)"
              />
              %
            </span>
            <span className="font-medium w-32 text-right">{fmt(totals.taxAmount)}</span>
          </div>
          <div className="flex items-center gap-6 text-base pt-1">
            <span className="font-bold text-text-primary">Total</span>
            <span className="font-bold w-32 text-right">{fmt(totals.total)}</span>
          </div>
        </div>
      </section>

      {/* ── Condiciones ─────────────────────────────────────────────────── */}
      <section className="bg-white border border-border-subtle rounded-lg p-6">
        <h2 className="text-sm font-bold text-text-primary mb-4">Condiciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Moneda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar estadounidense</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Vigencia (fecha de expiración)</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-text-secondary">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Notas visibles para el cliente…" />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-text-secondary">Términos y condiciones</label>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={inputCls} placeholder="Condiciones de pago, tiempos de entrega, garantías…" />
          </div>
        </div>
      </section>

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear cotización"}
        </button>
      </div>
    </form>
  );
}
