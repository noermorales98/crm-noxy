import Link from "next/link";

export default function DbUnavailableNotice({
  message,
  stale = false,
  compact = false,
}: {
  message?: string;
  stale?: boolean;
  compact?: boolean;
}) {
  const text =
    message ??
    (stale
      ? "Mostrando datos en caché: la base de datos alcanzó su límite de conexiones o no responde."
      : "La base de datos no está disponible temporalmente. Puedes seguir navegando el CRM con datos limitados.");

  if (compact) {
    return (
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900"
      >
        {text}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mx-4 mt-4 rounded-surface border border-amber-200 bg-amber-50 px-4 py-4 sm:mx-6"
    >
      <p className="text-sm font-semibold text-amber-950">Base de datos temporalmente limitada</p>
      <p className="mt-1 text-sm text-amber-900/90">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center rounded-control bg-amber-900 px-3 text-xs font-semibold text-white hover:bg-amber-800"
        >
          Ir al inicio
        </Link>
        <form action="">
          <button
            type="submit"
            className="inline-flex min-h-9 items-center rounded-control border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 hover:bg-amber-100"
          >
            Reintentar
          </button>
        </form>
      </div>
    </div>
  );
}
