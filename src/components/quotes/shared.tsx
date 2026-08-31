export const QUOTE_STATUS_META: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "Borrador", className: "bg-gray-100 text-gray-600" },
  ENVIADA: { label: "Enviada", className: "bg-blue-50 text-blue-600" },
  ACEPTADA: { label: "Aceptada", className: "bg-amber-50 text-amber-600" },
  PARCIAL: { label: "Parcialmente pagada", className: "bg-orange-50 text-orange-600" },
  PAGADA: { label: "Pagada", className: "bg-green-50 text-green-600" },
  VENCIDA: { label: "Vencida", className: "bg-red-50 text-red-500" },
  RECHAZADA: { label: "Rechazada", className: "bg-rose-50 text-rose-600" },
};

export function QuoteStatusBadge({ status }: { status: string }) {
  const meta = QUOTE_STATUS_META[status] ?? QUOTE_STATUS_META.BORRADOR;
  return (
    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${meta.className}`}>
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
