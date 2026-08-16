"use client";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon, Edit01Icon, CheckmarkCircle01Icon,
  User02Icon, Call02Icon, Mail01Icon, DollarCircleIcon, CalendarCheckIn01Icon,
  RefreshIcon, MoreHorizontalIcon,
  Building02Icon, CheckListIcon,
} from "@hugeicons/core-free-icons";
import DatePicker from "./DatePicker";
import { inputCompact as inputCls } from "@/src/lib/crm-ui";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHONE_CODES = [
  { code: "+52", flag: "🇲🇽", label: "MX" },
  { code: "+1",  flag: "🇺🇸", label: "US/CA" },
  { code: "+34", flag: "🇪🇸", label: "ES" },
  { code: "+54", flag: "🇦🇷", label: "AR" },
  { code: "+57", flag: "🇨🇴", label: "CO" },
  { code: "+51", flag: "🇵🇪", label: "PE" },
  { code: "+56", flag: "🇨🇱", label: "CL" },
  { code: "+58", flag: "🇻🇪", label: "VE" },
  { code: "+44", flag: "🇬🇧", label: "UK" },
  { code: "+49", flag: "🇩🇪", label: "DE" },
  { code: "+33", flag: "🇫🇷", label: "FR" },
];

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtCurrency(v: number, cur: string) {
  if (cur === "MXN") return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(v);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PhoneInput({ code, phone, onCodeChange, onPhoneChange }: {
  code: string; phone: string; onCodeChange: (v: string) => void; onPhoneChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="px-2 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-border-subtle shrink-0"
      >
        {PHONE_CODES.map((c) => (
          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="Número de teléfono"
        className={`${inputCls} flex-1`}
      />
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function ClientDrawer({
  client: initialClient,
  onClose,
  onUpdate,
}: {
  client: any;
  onClose: () => void;
  onUpdate: (updated: any) => void;
}) {
  const [client, setClient] = useState(initialClient);
  const [tab, setTab] = useState<"info" | "pagos">("info");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: client.name,
    contactName: client.contactName || "",
    phone: client.phone || "",
    phoneCode: client.phoneCode || "+52",
    email: client.email || "",
    monthlyFee: String(client.monthlyFee),
    currency: client.currency || "USD",
    billingDay: String(client.billingDay || 1),
    startDate: client.startDate ? new Date(client.startDate).toISOString().slice(0, 10) : "",
    autoMarkPaid: client.autoMarkPaid || false,
    isActive: client.isActive !== false,
    notes: client.notes || "",
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // ─── Save info ──────────────────────────────────────────────────────────────

  async function saveInfo() {
    setSaving(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monthlyFee: parseFloat(form.monthlyFee),
        billingDay: parseInt(form.billingDay),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      onUpdate(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  // ─── Payments ───────────────────────────────────────────────────────────────

  async function markPaid(paymentId?: string) {
    const month = currentMonth;
    const year = currentYear;
    if (paymentId) {
      const res = await fetch(`/api/clients/${client.id}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: "RECIBIDO" }),
      });
      if (res.ok) {
        setClient((prev: any) => ({
          ...prev,
          payments: prev.payments.map((p: any) =>
            p.id === paymentId ? { ...p, status: "RECIBIDO", receivedAt: new Date().toISOString() } : p
          ),
        }));
      }
    } else {
      const res = await fetch(`/api/clients/${client.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, amount: client.monthlyFee, currency: client.currency, status: "RECIBIDO" }),
      });
      if (res.ok) {
        const p = await res.json();
        // mark it received
        await fetch(`/api/clients/${client.id}/payments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: p.id, status: "RECIBIDO" }),
        });
        setClient((prev: any) => ({ ...prev, payments: [{ ...p, status: "RECIBIDO", receivedAt: new Date().toISOString() }, ...prev.payments] }));
      }
    }
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

  const recentPayments = [...(client.payments || [])].sort(
    (a: any, b: any) => b.year !== a.year ? b.year - a.year : b.month - a.month
  ).slice(0, 12);

  const currentPayment = client.payments?.find(
    (p: any) => p.month === currentMonth && p.year === currentYear
  );
  const isPaidThisMonth = currentPayment?.status === "RECIBIDO";

  const monthsSince = (() => {
    const start = new Date(client.startDate);
    return (currentYear - start.getFullYear()) * 12 + (currentMonth - (start.getMonth() + 1));
  })();

  const paidCount = recentPayments.filter((p: any) => p.status === "RECIBIDO").length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-start gap-3 shrink-0">
          <div className="w-11 h-11 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-bold shrink-0">
            {client.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary truncate">{client.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${client.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-100 text-text-secondary"}`}>
                {client.isActive ? "Activo" : "Pausado"}
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary">
              {fmtCurrency(client.monthlyFee, client.currency)}
              <span className="text-xs font-normal text-text-secondary ml-1">/mes · {monthsSince > 0 ? `${monthsSince} meses` : "Nuevo"}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setEditing(e => !e)}
              className={`p-2 rounded-lg transition-colors ${editing ? "bg-action-primary text-white" : "text-text-secondary hover:text-text-primary hover:bg-nav-hover"}`}
            >
              <HugeiconsIcon icon={Edit01Icon} size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary hover:bg-nav-hover rounded-lg transition-colors">
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-6 shrink-0">
          {(["info", "pagos"] as const).map((t) => {
            const labels = { info: "Información", pagos: "Pagos" };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? "border-action-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <div className="p-6 flex flex-col gap-5">

              {editing ? (
                /* ── Edit mode ── */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Nombre del cliente</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Datos de contacto</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Nombre completo</label>
                        <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className={inputCls} placeholder="Nombre del contacto" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Teléfono</label>
                        <PhoneInput
                          code={form.phoneCode}
                          phone={form.phone}
                          onCodeChange={v => setForm(f => ({ ...f, phoneCode: v }))}
                          onPhoneChange={v => setForm(f => ({ ...f, phone: v }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Correo (opcional)</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="correo@ejemplo.com" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Facturación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Cuota mensual</label>
                        <input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} className={inputCls} min={0} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Moneda</label>
                        <div className="flex rounded-lg border border-border-subtle overflow-hidden">
                          {["USD", "MXN"].map(c => (
                            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, currency: c }))}
                              className={`flex-1 py-2 text-sm font-bold transition-all ${form.currency === c ? "bg-action-primary text-white" : "text-text-secondary hover:bg-surface-sidebar"}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Día de cobro</label>
                        <input type="number" value={form.billingDay} onChange={e => setForm(f => ({ ...f, billingDay: e.target.value }))} className={inputCls} min={1} max={28} />
                      </div>
                      <DatePicker label="Inicio de contrato" value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} placeholder="Seleccionar" align="right" />
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Cobro automático</p>
                        <p className="text-xs text-text-secondary">Marca los pagos como recibidos automáticamente cada mes</p>
                      </div>
                      <div
                        onClick={() => setForm(f => ({ ...f, autoMarkPaid: !f.autoMarkPaid }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${form.autoMarkPaid ? "bg-action-primary" : "bg-nav-active"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.autoMarkPaid ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <p className="text-sm font-semibold text-text-primary">Cliente activo</p>
                      <div
                        onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-emerald-500" : "bg-nav-active"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Notas internas</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={3} placeholder="Servicio, condiciones especiales..." />
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-border-subtle">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2.5 text-sm font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">Cancelar</button>
                    <button onClick={saveInfo} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-action-primary hover:bg-black rounded-lg transition-colors disabled:opacity-50">
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>

              ) : (
                /* ── View mode ── */
                <>
                  {/* Contact info */}
                  <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">Contacto</p>
                    {client.contactName ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {client.contactName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{client.contactName}</p>
                          {client.phone && (
                            <p className="text-xs text-text-secondary">{client.phoneCode} {client.phone}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">Sin contacto registrado</p>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-text-primary">
                        <HugeiconsIcon icon={Mail01Icon} size={14} color="#9ca3af" />
                        <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-text-primary">
                        <HugeiconsIcon icon={Call02Icon} size={14} color="#9ca3af" />
                        <a href={`tel:${client.phoneCode}${client.phone}`} className="hover:underline">
                          {client.phoneCode} {client.phone}
                        </a>
                      </div>
                    )}
                    {!client.contactName && !client.email && !client.phone && (
                      <button onClick={() => setEditing(true)} className="text-xs font-semibold text-text-secondary hover:text-text-primary underline underline-offset-2">
                        + Agregar información de contacto
                      </button>
                    )}
                  </div>

                  {/* Billing info */}
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">Facturación</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Cuota mensual", val: fmtCurrency(client.monthlyFee, client.currency) },
                        { label: "Moneda", val: client.currency },
                        { label: "Día de cobro", val: `Día ${client.billingDay}` },
                        { label: "Inicio", val: new Date(client.startDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-surface-sidebar rounded-lg p-3">
                          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-text-primary">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Auto-pay badge */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${client.autoMarkPaid ? "bg-emerald-50 border-emerald-100" : "bg-surface-sidebar border-border-subtle"}`}>
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={RefreshIcon} size={16} color={client.autoMarkPaid ? "#059669" : "#9ca3af"} />
                        <p className="text-sm font-semibold text-text-primary">Cobro automático</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${client.autoMarkPaid ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-text-secondary"}`}>
                        {client.autoMarkPaid ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-2">Notas</p>
                      <p className="text-sm text-text-primary bg-surface-sidebar rounded-lg p-4">{client.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PAGOS TAB ── */}
          {tab === "pagos" && (
            <div className="p-6 flex flex-col gap-4">
              {/* This month */}
              <div className={`rounded-lg p-5 border ${isPaidThisMonth ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                    {MONTH_NAMES[currentMonth - 1]} {currentYear}
                  </p>
                  {isPaidThisMonth ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                      Pagado
                    </span>
                  ) : (
                    <span className="text-amber-600 text-xs font-bold">Pendiente</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-text-primary mb-3">{fmtCurrency(client.monthlyFee, client.currency)}</p>
                {!isPaidThisMonth && (
                  <button
                    onClick={() => markPaid(currentPayment?.id)}
                    className="w-full py-2.5 text-sm font-semibold bg-action-primary text-white rounded-lg hover:bg-black transition-colors"
                  >
                    Marcar como pagado
                  </button>
                )}
                {isPaidThisMonth && currentPayment?.receivedAt && (
                  <p className="text-xs text-emerald-600">
                    Recibido el {new Date(currentPayment.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long" })}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-sidebar rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">{paidCount}</p>
                  <p className="text-[10px] text-text-secondary font-semibold uppercase">Pagados</p>
                </div>
                <div className="bg-surface-sidebar rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">{monthsSince}</p>
                  <p className="text-[10px] text-text-secondary font-semibold uppercase">Meses</p>
                </div>
                <div className="bg-surface-sidebar rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">{fmtCurrency(client.monthlyFee * paidCount, client.currency).replace(/\.\d+/, "")}</p>
                  <p className="text-[10px] text-text-secondary font-semibold uppercase">Total</p>
                </div>
              </div>

              {/* History */}
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Historial</p>
                <div className="flex flex-col gap-2">
                  {recentPayments.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-6">Sin pagos registrados.</p>
                  ) : (
                    recentPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-border-subtle rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{MONTH_NAMES[p.month - 1]} {p.year}</p>
                          {p.receivedAt && (
                            <p className="text-xs text-text-secondary">{new Date(p.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-text-primary">{fmtCurrency(p.amount, p.currency)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "RECIBIDO" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                            {p.status === "RECIBIDO" ? "Pagado" : "Pendiente"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
