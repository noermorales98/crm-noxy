"use client";
import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon, Edit01Icon, CheckmarkCircle01Icon, Add01Icon, Delete02Icon,
  User02Icon, Call02Icon, Mail01Icon, DollarCircleIcon, CalendarCheckIn01Icon,
  LockPasswordIcon, GlobalIcon, InstagramIcon, Facebook01Icon, Linkedin01Icon,
  EyeIcon, ViewOffIcon, Link01Icon, RefreshIcon, MoreHorizontalIcon,
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

const SOCIAL_PLATFORMS = [
  { value: "instagram",  label: "Instagram",  icon: InstagramIcon,  color: "text-pink-500" },
  { value: "facebook",   label: "Facebook",   icon: Facebook01Icon,   color: "text-blue-600" },
  { value: "linkedin",   label: "LinkedIn",   icon: Linkedin01Icon,   color: "text-blue-500" },
  { value: "tiktok",     label: "TikTok",     icon: GlobalIcon,       color: "text-text-primary" },
  { value: "youtube",    label: "YouTube",    icon: GlobalIcon,       color: "text-red-600" },
  { value: "twitter",    label: "Twitter / X",icon: GlobalIcon,       color: "text-text-primary" },
  { value: "whatsapp",   label: "WhatsApp",   icon: GlobalIcon,       color: "text-green-500" },
  { value: "website",    label: "Sitio web",  icon: GlobalIcon,       color: "text-text-secondary" },
  { value: "otro",       label: "Otro",       icon: Link01Icon,       color: "text-text-secondary" },
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

function VaultPasswordRow({ entry, onUpdate, onDelete }: {
  entry: any;
  onUpdate: (id: string, data: Partial<any>) => void;
  onDelete: (id: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: entry.label, username: entry.username || "", password: entry.password || "", url: entry.url || "", notes: entry.notes || "" });

  function save() {
    onUpdate(entry.id, form);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 border border-border-subtle">
        <input value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} className={inputCls} placeholder="Etiqueta (ej. cPanel, WordPress)" />
        <input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} className={inputCls} placeholder="Usuario / email" />
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            className={`${inputCls} pr-10`}
            placeholder="Contraseña"
          />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={16} />
          </button>
        </div>
        <input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} className={inputCls} placeholder="URL (opcional)" />
        <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Notas adicionales" />
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">Cancelar</button>
          <button onClick={save} className="flex-1 py-2 text-xs font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors">Guardar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/vault flex items-start gap-3 bg-white border border-border-subtle rounded-lg p-4 hover:border-border-subtle transition-colors">
      <div className="w-9 h-9 rounded-lg bg-accent-charcoal flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={LockPasswordIcon} size={16} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">{entry.label}</p>
        {entry.username && <p className="text-xs text-text-secondary truncate">{entry.username}</p>}
        {entry.password && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-text-primary tracking-wider">
              {show ? entry.password : "•".repeat(Math.min(entry.password.length, 12))}
            </span>
            <button onClick={() => setShow(s => !s)} className="text-text-secondary hover:text-text-secondary">
              <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={13} />
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(entry.password)}
              className="text-[10px] font-semibold text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-nav-active px-2 py-0.5 rounded-lg transition-colors"
            >
              Copiar
            </button>
          </div>
        )}
        {entry.url && (
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">
            {entry.url}
          </a>
        )}
        {entry.notes && <p className="text-xs text-text-secondary mt-1">{entry.notes}</p>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover/vault:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-nav-hover rounded-lg">
          <HugeiconsIcon icon={Edit01Icon} size={13} />
        </button>
        <button onClick={() => onDelete(entry.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
          <HugeiconsIcon icon={Delete02Icon} size={13} />
        </button>
      </div>
    </div>
  );
}

function SocialRow({ entry, onDelete }: { entry: any; onDelete: (id: string) => void }) {
  const platform = SOCIAL_PLATFORMS.find(p => p.value === entry.label) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
  return (
    <div className="group/social flex items-center gap-3 bg-white border border-border-subtle rounded-lg px-4 py-3 hover:border-border-subtle transition-colors">
      <div className={`shrink-0 ${platform.color}`}>
        <HugeiconsIcon icon={platform.icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-secondary">{platform.label}</p>
        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">
          {entry.url}
        </a>
      </div>
      <button onClick={() => onDelete(entry.id)} className="opacity-0 group-hover/social:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
        <HugeiconsIcon icon={Delete02Icon} size={13} />
      </button>
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
  const [tab, setTab] = useState<"info" | "pagos" | "boveda">("info");
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

  // Vault
  const [vaultEntries, setVaultEntries] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [newCred, setNewCred] = useState({ label: "", username: "", password: "", url: "", notes: "" });
  const [newSocial, setNewSocial] = useState({ platform: "instagram", url: "" });
  const [showNewPass, setShowNewPass] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchVault = useCallback(async () => {
    setLoadingVault(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/vault`);
      if (res.ok) setVaultEntries(await res.json());
    } finally {
      setLoadingVault(false);
    }
  }, [client.id]);

  useEffect(() => {
    if (tab === "boveda") fetchVault();
  }, [tab, fetchVault]);

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

  // ─── Vault CRUD ──────────────────────────────────────────────────────────────

  async function addCredential() {
    if (!newCred.label) return;
    const res = await fetch(`/api/clients/${client.id}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "credential", ...newCred }),
    });
    if (res.ok) {
      const entry = await res.json();
      setVaultEntries(prev => [entry, ...prev]);
      setNewCred({ label: "", username: "", password: "", url: "", notes: "" });
      setShowAddCredential(false);
    }
  }

  async function addSocial() {
    if (!newSocial.url) return;
    const res = await fetch(`/api/clients/${client.id}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "social", label: newSocial.platform, url: newSocial.url }),
    });
    if (res.ok) {
      const entry = await res.json();
      setVaultEntries(prev => [...prev, entry]);
      setNewSocial({ platform: "instagram", url: "" });
      setShowAddSocial(false);
    }
  }

  async function updateVaultEntry(entryId: string, data: Partial<any>) {
    const res = await fetch(`/api/clients/${client.id}/vault`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setVaultEntries(prev => prev.map(e => e.id === entryId ? updated : e));
    }
  }

  async function deleteVaultEntry(entryId: string) {
    const res = await fetch(`/api/clients/${client.id}/vault`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    if (res.ok) setVaultEntries(prev => prev.filter(e => e.id !== entryId));
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

  const credentials = vaultEntries.filter(e => e.type === "credential");
  const socials = vaultEntries.filter(e => e.type === "social");

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
              className={`p-2 rounded-lg transition-colors ${editing ? "bg-accent-charcoal text-white" : "text-text-secondary hover:text-text-primary hover:bg-nav-hover"}`}
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
          {(["info", "pagos", "boveda"] as const).map((t) => {
            const labels = { info: "Información", pagos: "Pagos", boveda: "Bóveda" };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? "border-accent-charcoal text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
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
                              className={`flex-1 py-2 text-sm font-bold transition-all ${form.currency === c ? "bg-accent-charcoal text-white" : "text-text-secondary hover:bg-surface-sidebar"}`}>
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
                        className={`w-11 h-6 rounded-full transition-colors relative ${form.autoMarkPaid ? "bg-accent-charcoal" : "bg-nav-active"}`}
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
                    <button onClick={saveInfo} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors disabled:opacity-50">
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
                    className="w-full py-2.5 text-sm font-semibold bg-accent-charcoal text-white rounded-lg hover:bg-black transition-colors"
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

          {/* ── BÓVEDA TAB ── */}
          {tab === "boveda" && (
            <div className="p-6 flex flex-col gap-6">

              {loadingVault ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Redes sociales */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">Redes sociales</p>
                      <button onClick={() => setShowAddSocial(s => !s)} className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
                        <HugeiconsIcon icon={Add01Icon} size={13} />Agregar
                      </button>
                    </div>

                    {showAddSocial && (
                      <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 mb-3 border border-border-subtle">
                        <select value={newSocial.platform} onChange={e => setNewSocial(s => ({ ...s, platform: e.target.value }))} className={inputCls}>
                          {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <input value={newSocial.url} onChange={e => setNewSocial(s => ({ ...s, url: e.target.value }))} className={inputCls} placeholder="https://..." />
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddSocial(false)} className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">Cancelar</button>
                          <button onClick={addSocial} disabled={!newSocial.url} className="flex-1 py-2 text-xs font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors disabled:opacity-40">Guardar</button>
                        </div>
                      </div>
                    )}

                    {socials.length === 0 && !showAddSocial ? (
                      <p className="text-sm text-text-secondary py-3 text-center">Sin redes sociales guardadas.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {socials.map(e => <SocialRow key={e.id} entry={e} onDelete={deleteVaultEntry} />)}
                      </div>
                    )}
                  </div>

                  {/* Contraseñas */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">Bóveda de contraseñas</p>
                      <button onClick={() => setShowAddCredential(s => !s)} className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
                        <HugeiconsIcon icon={Add01Icon} size={13} />Agregar
                      </button>
                    </div>

                    {showAddCredential && (
                      <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 mb-3 border border-border-subtle">
                        <input value={newCred.label} onChange={e => setNewCred(c => ({ ...c, label: e.target.value }))} className={inputCls} placeholder="Etiqueta (ej. cPanel, WordPress, Google Ads)" autoFocus />
                        <input value={newCred.username} onChange={e => setNewCred(c => ({ ...c, username: e.target.value }))} className={inputCls} placeholder="Usuario o email" />
                        <div className="relative">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newCred.password}
                            onChange={e => setNewCred(c => ({ ...c, password: e.target.value }))}
                            className={`${inputCls} pr-10`}
                            placeholder="Contraseña"
                          />
                          <button type="button" onClick={() => setShowNewPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
                            <HugeiconsIcon icon={showNewPass ? ViewOffIcon : EyeIcon} size={16} />
                          </button>
                        </div>
                        <input value={newCred.url} onChange={e => setNewCred(c => ({ ...c, url: e.target.value }))} className={inputCls} placeholder="URL (opcional)" />
                        <textarea value={newCred.notes} onChange={e => setNewCred(c => ({ ...c, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Notas adicionales" />
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddCredential(false)} className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">Cancelar</button>
                          <button onClick={addCredential} disabled={!newCred.label} className="flex-1 py-2 text-xs font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors disabled:opacity-40">Guardar</button>
                        </div>
                      </div>
                    )}

                    {credentials.length === 0 && !showAddCredential ? (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <HugeiconsIcon icon={LockPasswordIcon} size={18} color="#9ca3af" />
                        </div>
                        <p className="text-sm text-text-secondary">Sin contraseñas guardadas.</p>
                        <button onClick={() => setShowAddCredential(true)} className="mt-2 text-xs font-semibold text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
                          Guardar primera contraseña
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {credentials.map(e => (
                          <VaultPasswordRow key={e.id} entry={e} onUpdate={updateVaultEntry} onDelete={deleteVaultEntry} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
