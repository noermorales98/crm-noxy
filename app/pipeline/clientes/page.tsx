"use client";

import { useState, useEffect, useCallback } from "react";
import { useHeader } from "@/src/context/HeaderContext";
import DatePicker from "@/src/components/DatePicker";
import ClientDrawer from "@/src/components/ClientDrawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  DollarCircleIcon,
  RefreshIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";
import { fmtUSD, fmtMXN, fmtCurrency, StatCard, StatChip, type StatDef } from "@/src/components/pipeline/PipelineShared";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── New Client Modal ─────────────────────────────────────────────────────────

function NewClientModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (client: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !monthlyFee || !startDate) {
      setError("Nombre, cuota y fecha de inicio son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, monthlyFee, currency, startDate, billingDay, notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al crear el cliente.");
        return;
      }
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary">Nuevo cliente</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Nombre del cliente *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ej. Empresa Ejemplo S.A."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Cuota mensual *</label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className={inputCls}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                <option value="USD">USD — Dólar</option>
                <option value="MXN">MXN — Peso mexicano</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Inicio de contrato *"
              value={startDate}
              onChange={setStartDate}
              placeholder="Seleccionar"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Día de cobro</label>
              <input
                type="number"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className={inputCls}
                min="1"
                max="28"
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Servicio, condiciones, etc."
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onMarkPaid,
  onClick,
  onDelete,
}: {
  client: any;
  onMarkPaid: (clientId: string, paymentId: string) => void;
  onClick: () => void;
  onDelete?: (clientId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentPayment = client.payments?.find(
    (p: any) => p.month === currentMonth && p.year === currentYear
  );

  const isPaid = currentPayment?.status === "RECIBIDO";
  const isPending = !currentPayment || currentPayment.status === "PENDIENTE";

  const monthsSinceStart = (() => {
    const start = new Date(client.startDate);
    return (
      (currentYear - start.getFullYear()) * 12 +
      (currentMonth - (start.getMonth() + 1))
    );
  })();

  return (
    <div
      onClick={() => !confirming && onClick()}
      className="group relative bg-white border border-border-subtle rounded-lg p-3.5 hover:border-border-subtle transition-all cursor-pointer"
    >
      {onDelete && confirming && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/95 rounded-lg border border-border-subtle"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1.5 rounded-lg hover:bg-nav-hover text-text-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onDelete(client.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition-colors"
          >
            Eliminar
          </button>
        </div>
      )}

      {onDelete && !confirming && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          title="Eliminar cliente"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 transition-all z-[1]"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 pr-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{client.name}</p>
              {client.company && (
                <p className="text-[11px] text-text-secondary truncate">{client.company.name}</p>
              )}
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ml-1 ${
            client.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-gray-100 text-text-secondary border-border-subtle"
          }`}
        >
          {client.isActive ? "Activo" : "Pausado"}
        </span>
      </div>

      {/* Fee */}
      <p className="text-lg font-bold text-text-primary mb-0.5">
        {fmtCurrency(client.monthlyFee, client.currency)}
        <span className="text-xs font-normal text-text-secondary ml-1">/mes</span>
      </p>
      <p className="text-[11px] text-text-secondary mb-3">
        {client.currency} · Día {client.billingDay} ·{" "}
        {monthsSinceStart > 0 ? `${monthsSinceStart} mes${monthsSinceStart !== 1 ? "es" : ""}` : "Nuevo"}
      </p>

      {/* This month payment status */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary mb-0.5">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </p>
          {isPaid ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              <span className="text-xs font-semibold">Pagado</span>
              {currentPayment?.receivedAt && (
                <span className="text-xs text-text-secondary">
                  · {new Date(currentPayment.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500">
              <HugeiconsIcon icon={DollarCircleIcon} size={14} />
              <span className="text-xs font-semibold">Pendiente</span>
            </div>
          )}
        </div>

        {isPending && client.isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkPaid(client.id, currentPayment?.id); }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-action-primary text-action-primary-foreground hover:bg-black transition-colors"
          >
            Marcar pagado
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { setConfig, resetState } = useHeader();
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [hiddenStats, setHiddenStats] = useState<Set<string>>(new Set());

  // ─── Hidden stat cards (persisted) ─────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pipeline_clientes_hidden_stats");
      if (raw) setHiddenStats(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const hideStat = useCallback((id: string) => {
    setHiddenStats((prev) => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem("pipeline_clientes_hidden_stats", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const restoreStat = useCallback((id: string) => {
    setHiddenStats((prev) => {
      const next = new Set(prev);
      next.delete(id);
      try { localStorage.setItem("pipeline_clientes_hidden_stats", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ─── Header config ────────────────────────────────────────────────────────

  useEffect(() => {
    resetState();
    setConfig({
      title: "Clientes",
      addButton: {
        label: "Nuevo cliente",
        onClick: () => setShowClientModal(true),
      },
    });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch { console.error("Error cargando clientes"); }
    finally { setLoadingClients(false); }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ─── Mark paid / delete ───────────────────────────────────────────────────

  const handleMarkPaid = async (clientId: string, paymentId?: string) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (paymentId) {
      // Update existing payment
      await fetch(`/api/clients/${clientId}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: "RECIBIDO" }),
      });
    } else {
      // Create new payment as received
      const client = clients.find((c) => c.id === clientId);
      await fetch(`/api/clients/${clientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          amount: client?.monthlyFee,
          currency: client?.currency,
          status: "RECIBIDO",
        }),
      });
      // Then mark as received
      const res = await fetch(`/api/clients/${clientId}/payments`);
      if (res.ok) {
        const payments = await res.json();
        const p = payments.find((x: any) => x.month === month && x.year === year);
        if (p) {
          await fetch(`/api/clients/${clientId}/payments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: p.id, status: "RECIBIDO" }),
          });
        }
      }
    }

    fetchClients();
  };

  const handleDeleteClient = async (clientId: string) => {
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) return;
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (selectedClient?.id === clientId) setSelectedClient(null);
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const activeClients = clients.filter((c) => c.isActive);
  const mrrUSD = activeClients
    .filter((c) => c.currency === "USD")
    .reduce((s, c) => s + c.monthlyFee, 0);
  const mrrMXN = activeClients
    .filter((c) => c.currency === "MXN")
    .reduce((s, c) => s + c.monthlyFee, 0);
  const pendingThisMonth = activeClients.filter(
    (c) => !c.payments?.some((p: any) => p.month === currentMonth && p.year === currentYear && p.status === "RECIBIDO")
  ).length;

  const clientStats: StatDef[] = [
    {
      id: "active_clients",
      label: "Clientes activos",
      value: String(activeClients.length),
      sub: `${clients.length} clientes en total`,
      chipValue: String(activeClients.length),
    },
    {
      id: "mrr_usd",
      label: "MRR en USD",
      value: fmtUSD(mrrUSD),
      sub: "Ingresos mensuales recurrentes",
      badge: mrrUSD > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtUSD(mrrUSD),
    },
    {
      id: "mrr_mxn",
      label: "MRR en MXN",
      value: fmtMXN(mrrMXN),
      sub: "Ingresos mensuales recurrentes",
      badge: mrrMXN > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtMXN(mrrMXN),
    },
    {
      id: "pending_month",
      label: "Pendientes este mes",
      value: String(pendingThisMonth),
      sub: `de ${activeClients.length} clientes activos`,
      badge: pendingThisMonth > 0 ? `${pendingThisMonth} pendientes` : undefined,
      badgePositive: false,
      chipValue: String(pendingThisMonth),
    },
  ];

  const visibleStats = clientStats.filter((s) => !hiddenStats.has(s.id));
  const minimizedStats = clientStats.filter((s) => hiddenStats.has(s.id));

  return (
    <>
      <main className="flex-1 min-h-0 overflow-y-auto bg-surface-app font-sans">

        {/* ── Page header ── */}
        <div className="px-5 pt-3 pb-2 bg-white border-b border-border-subtle">

          {/* Stats row */}
          {visibleStats.length > 0 && (
            <div className="flex gap-2.5 mb-2 overflow-x-auto pb-0.5">
              {visibleStats.map((s) => (
                <StatCard
                  key={s.id}
                  label={s.label}
                  value={s.value}
                  values={s.values}
                  sub={s.sub}
                  badge={s.badge}
                  badgePositive={s.badgePositive}
                  onHide={() => hideStat(s.id)}
                />
              ))}
            </div>
          )}

          {/* Minimized summary bar */}
          {minimizedStats.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {minimizedStats.map((s) => (
                <StatChip
                  key={s.id}
                  label={s.label}
                  value={s.chipValue}
                  onRestore={() => restoreStat(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="px-5 py-3">
          {loadingClients ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 border border-border-subtle">
                <HugeiconsIcon icon={RefreshIcon} size={22} color="#9ca3af" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Sin clientes recurrentes</h3>
              <p className="text-xs text-text-secondary mb-3 max-w-xs">
                Agrega tus clientes establecidos que pagan mensualmente para llevar el control de sus pagos.
              </p>
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-action-primary text-action-primary-foreground text-sm font-semibold rounded-lg hover:bg-black transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={15} />
                Agregar primer cliente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onMarkPaid={handleMarkPaid}
                  onClick={() => setSelectedClient(client)}
                  onDelete={handleDeleteClient}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Client modal */}
      {showClientModal && (
        <NewClientModal
          onSuccess={() => { setShowClientModal(false); fetchClients(); }}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {/* Client drawer */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={(updated) => {
            setClients((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
            setSelectedClient((prev: any) => prev?.id === updated.id ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </>
  );
}
