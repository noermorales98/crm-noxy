export const QUOTE_STATUS_META: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "Borrador", className: "bg-surface-sidebar text-text-secondary" },
  ENVIADA: { label: "Enviada", className: "bg-blue-50 text-blue-700" },
  ACEPTADA: { label: "Aceptada", className: "bg-amber-50 text-amber-800" },
  PARCIAL: { label: "Parcialmente pagada", className: "bg-orange-50 text-orange-700" },
  PAGADA: { label: "Pagada", className: "bg-success-soft text-success" },
  VENCIDA: { label: "Vencida", className: "bg-danger-soft text-danger" },
  RECHAZADA: { label: "Rechazada", className: "bg-rose-50 text-rose-700" },
};

export function QuoteStatusBadge({ status }: { status: string }) {
  const meta = QUOTE_STATUS_META[status] ?? QUOTE_STATUS_META.BORRADOR;
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap px-2.5 text-xs font-semibold rounded-full ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function formatQuoteMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
