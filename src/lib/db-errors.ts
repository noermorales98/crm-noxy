/** Client-safe DB error helpers (no PrismaClient import). */

export class DbUnavailableError extends Error {
  readonly code = "DB_UNAVAILABLE" as const;
  readonly retryable = true;
  constructor(
    message = "La base de datos no está disponible temporalmente (límite de conexiones u otro error de servidor).",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "DbUnavailableError";
  }
}

export function isDbUnavailableError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DbUnavailableError) return true;

  const anyErr = error as {
    name?: string;
    code?: string;
    message?: string;
    errorCode?: string;
  };

  const message = String(anyErr.message ?? error);
  const name = String(anyErr.name ?? "");
  const code = String(anyErr.code ?? anyErr.errorCode ?? "");

  if (name === "DbUnavailableError") return true;
  if (name === "PrismaClientInitializationError") return true;
  if (code === "P1001" || code === "P1017" || code === "P1002") return true;
  if (/max_connections_per_hour/i.test(message)) return true;
  if (/ERROR 42000\s*\(1226\)/i.test(message)) return true;
  if (/Can't reach database server/i.test(message)) return true;
  if (/Server has closed the connection/i.test(message)) return true;
  if (/Too many connections/i.test(message)) return true;
  if (/PrismaClientInitializationError/i.test(message)) return true;

  return false;
}

export function dbUnavailableUserMessage(error?: unknown): string {
  const message = error ? String((error as { message?: string }).message ?? error) : "";
  if (/max_connections_per_hour|1226/i.test(message)) {
    return "Se alcanzó el límite horario de conexiones a la base de datos. El CRM sigue disponible con datos en caché o vacíos hasta que se restablezca.";
  }
  return "No se pudo conectar con la base de datos. El CRM sigue disponible con datos limitados o en caché.";
}
