"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useHeader } from "@/src/context/HeaderContext";
import DatePicker from "@/src/components/DatePicker";
import ClientDrawer from "@/src/components/ClientDrawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  DollarCircleIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";
import { fmtUSD, fmtMXN, fmtCurrency, StatCard, StatChip, type StatDef } from "@/src/components/pipeline/PipelineShared";
import DeleteClientVaultDialog from "@/src/components/DeleteClientVaultDialog";
import { ContactAvatar } from "@/src/components/ui/EntityIcon";
import { Chip, DataTable, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog } from "@/src/components/ui";

const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10";
const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, true, onClose);

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-brand-obsidian/35 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-client-title"
        className="w-full max-w-md rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="new-client-title" className="text-base font-semibold text-text-primary">Nuevo cliente</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div role="alert" className="rounded-control bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-name" className="text-sm font-semibold text-text-primary">Nombre del cliente *</label>
            <input
              id="client-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ej. Empresa Ejemplo S.A."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-fee" className="text-sm font-semibold text-text-primary">Cuota mensual *</label>
              <input
                id="client-fee"
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
              <label htmlFor="client-currency" className="text-sm font-semibold text-text-primary">Moneda</label>
              <select id="client-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                <option value="USD">USD (dólar)</option>
                <option value="MXN">MXN (peso mexicano)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker label="Inicio de contrato *" value={startDate} onChange={setStartDate} placeholder="Seleccionar" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-billing-day" className="text-sm font-semibold text-text-primary">Día de cobro</label>
              <input
                id="client-billing-day"
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
            <label htmlFor="client-notes" className="text-sm font-semibold text-text-primary">Notas</label>
            <textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Servicio, condiciones, etc."
            />
          </div>
          <div className="mt-2 flex gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} className={`${secondaryAction} flex-1`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={`${primaryAction} flex-1`}>
              {saving ? "Guardando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({
  client,
  onMarkPaid,
  onOpen,
  onDelete,
}: {
  client: any;
  onMarkPaid: (clientId: string, paymentId: string) => void;
  onOpen: () => void;
  onDelete?: (clientId: string) => void;
}) {
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
    <div className="flex w-full min-w-0 flex-col gap-3 py-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
      >
        <ContactAvatar />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-text-primary">{client.name}</span>
            <Chip tone={client.isActive ? "done" : "neutral"}>{client.isActive ? "Activo" : "Pausado"}</Chip>
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {client.company ? `${client.company.name} · ` : ""}
            {client.currency} · Día {client.billingDay} ·{" "}
            {monthsSinceStart > 0 ? `${monthsSinceStart} mes${monthsSinceStart !== 1 ? "es" : ""}` : "Nuevo"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums text-text-primary">{fmtCurrency(client.monthlyFee, client.currency)}</span>
          <span className="text-xs text-text-secondary">/mes</span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <div className="min-w-0 sm:w-40">
          <p className="text-xs font-semibold text-text-secondary">{MONTH_NAMES[currentMonth - 1]} {currentYear}</p>
          {isPaid ? (
            <p className="flex items-center gap-1.5 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              <span className="text-xs font-semibold">Pagado</span>
              {currentPayment?.receivedAt && (
                <span className="text-xs text-text-secondary">
                  {new Date(currentPayment.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-text-primary">
              <HugeiconsIcon icon={DollarCircleIcon} size={14} />
              <span className="text-xs font-semibold">Pendiente</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isPending && client.isActive && (
            <button
              type="button"
              onClick={() => onMarkPaid(client.id, currentPayment?.id)}
              className={primaryAction}
            >
              Marcar pagado
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(client.id)}
              aria-label={`Eliminar cliente ${client.name}`}
              title="Eliminar cliente"
              className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger lg:size-10"
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type PaymentRecord = { id: string; month: number; year: number; status: string; receivedAt?: string | null };
type ClientRecord = {
  id: string;
  name: string;
  isActive: boolean;
  currency: string;
  billingDay: number;
  monthlyFee: number;
  company?: { name: string } | null;
  payments?: PaymentRecord[];
};

// Estado de cobro del mes en curso, compartido por las columnas de la tabla.
function paymentState(client: ClientRecord) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const payment = client.payments?.find((p: PaymentRecord) => p.month === month && p.year === year);
  return {
    payment,
    isPaid: payment?.status === "RECIBIDO",
    isPending: !payment || payment.status === "PENDIENTE",
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

function clientColumns(handlers: { onMarkPaid: (clientId: string, paymentId: string) => void; onOpen: (client: ClientRecord) => void; onDelete?: (clientId: string) => void }) {
  return [
    {
      key: "client",
      header: "Cliente",
      render: (client: ClientRecord) => (
        <button
          type="button"
          onClick={() => handlers.onOpen(client)}
          className="flex min-w-0 items-center gap-3 rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ContactAvatar />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-text-primary">{client.name}</span>
              <Chip tone={client.isActive ? "done" : "neutral"}>{client.isActive ? "Activo" : "Pausado"}</Chip>
            </span>
            <span className="block truncate text-xs text-text-secondary">
              {client.currency} · Día {client.billingDay}
            </span>
          </span>
        </button>
      ),
    },
    { key: "company", header: "Empresa", render: (client: ClientRecord) => <span className="text-text-secondary">{client.company?.name || "—"}</span> },
    {
      key: "fee",
      header: "Cuota mensual",
      align: "right" as const,
      render: (client: ClientRecord) => <span className="font-medium text-text-primary">{fmtCurrency(client.monthlyFee, client.currency)}</span>,
    },
    {
      key: "payment",
      header: "Pago del mes",
      render: (client: ClientRecord) => {
        const { payment, isPaid, label } = paymentState(client);
        return isPaid ? (
          <span className="flex items-center gap-1.5 text-success">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
            <span className="text-xs font-semibold">Pagado</span>
            {payment?.receivedAt && (
              <span className="text-xs text-text-secondary">{new Date(payment.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-text-secondary">
            <HugeiconsIcon icon={DollarCircleIcon} size={14} />
            <span className="text-xs">Pendiente · {label}</span>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Acciones",
      align: "right" as const,
      render: (client: ClientRecord) => {
        const { payment, isPending } = paymentState(client);
        return (
          <span className="flex items-center justify-end gap-1">
            {isPending && client.isActive && (
              <button type="button" onClick={() => handlers.onMarkPaid(client.id, payment?.id as string)} className={primaryAction}>
                Marcar pagado
              </button>
            )}
            {handlers.onDelete && (
              <button
                type="button"
                onClick={() => handlers.onDelete?.(client.id)}
                aria-label={`Eliminar cliente ${client.name}`}
                title="Eliminar cliente"
                className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger lg:size-9"
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </button>
            )}
          </span>
        );
      },
    },
  ];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { setConfig, resetState } = useHeader();
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
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
      pageHeader: true,
    });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/clients?scope=billing");
      if (res.ok) setClients(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingClients(false);
    }
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

  const requestDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) setPendingDelete(client);
  };

  const confirmDeleteClient = async (vault: "delete" | "keep") => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/clients/${pendingDelete.id}?vault=${vault}`, { method: "DELETE" });
      if (!res.ok) return;
      setClients((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      if (selectedClient?.id === pendingDelete.id) setSelectedClient(null);
      setPendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
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
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Clientes"
            subtitle={loadingClients && clients.length === 0 ? "Cargando clientes…" : `${activeClients.length} activos · ${pendingThisMonth} pendientes de pago este mes`}
            actions={
              <button type="button" onClick={() => setShowClientModal(true)} className={primaryAction}>
                <HugeiconsIcon icon={Add01Icon} size={16} />
                Nuevo cliente
              </button>
            }
          />
        </Enter>

        {/* Resumen: cada cifra se puede ocultar; las ocultas quedan como chips para restaurarlas. */}
        {visibleStats.length > 0 && (
          <Enter index={1}>
            <section aria-label="Resumen de clientes" className="mb-3 flex overflow-x-auto rounded-surface border border-line bg-surface-elevated">
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
            </section>
          </Enter>
        )}

        {minimizedStats.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {minimizedStats.map((s) => (
              <StatChip key={s.id} label={s.label} value={s.chipValue} onRestore={() => restoreStat(s.id)} />
            ))}
          </div>
        )}

        <Enter index={2}>
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            {loadingClients && clients.length === 0 ? (
              <Skeleton shape="rows" count={4} label="Cargando clientes" />
            ) : loadError && clients.length === 0 ? (
              <ErrorState title="No se pudieron cargar los clientes" onRetry={fetchClients} />
            ) : (
              <DataTable
                label="Clientes recurrentes"
                columns={clientColumns({ onMarkPaid: handleMarkPaid, onOpen: setSelectedClient, onDelete: requestDeleteClient })}
                rows={clients as ClientRecord[]}
                getKey={(c: ClientRecord) => c.id}
                mobileRow={(client: ClientRecord) => (
                  <ClientRow
                    client={client}
                    onMarkPaid={handleMarkPaid}
                    onOpen={() => setSelectedClient(client)}
                    onDelete={requestDeleteClient}
                  />
                )}
                empty={
                  <EmptyState
                    title="Sin clientes recurrentes"
                    body="Agrega tus clientes establecidos que pagan mensualmente para llevar el control de sus pagos."
                    action={
                      <button type="button" onClick={() => setShowClientModal(true)} className={primaryAction}>
                        <HugeiconsIcon icon={Add01Icon} size={16} />
                        Agregar primer cliente
                      </button>
                    }
                  />
                }
              />
            )}
          </section>
        </Enter>
      </main>

      {showClientModal && (
        <NewClientModal
          onSuccess={() => { setShowClientModal(false); fetchClients(); }}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {pendingDelete && (
        <DeleteClientVaultDialog
          name={pendingDelete.name}
          vaultCount={pendingDelete._count?.vaultEntries ?? 0}
          busy={deleteBusy}
          onCancel={() => { if (!deleteBusy) setPendingDelete(null); }}
          onKeepVault={() => confirmDeleteClient("keep")}
          onDeleteVault={() => confirmDeleteClient("delete")}
        />
      )}

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
