"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRM global error]", error);
  }, [error]);

  const message = String(error?.message ?? "");
  const dbDown =
    /max_connections_per_hour|1226|PrismaClientInitializationError|Can't reach database/i.test(
      message,
    );

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F5F6FB", color: "#0B0B18" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: dbDown ? "#FFFBEB" : "#fff",
              border: `1px solid ${dbDown ? "#FDE68A" : "#DCDFE6"}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 18 }}>
              {dbDown ? "Base de datos temporalmente limitada" : "Error del CRM"}
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#555B6E" }}>
              {dbDown
                ? "Se alcanzó el límite de conexiones o la base no responde. Espera unos minutos y reintenta; tu sesión puede seguir activa."
                : error.message || "No se pudo cargar la aplicación."}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                minHeight: 40,
                padding: "0 16px",
                borderRadius: 10,
                border: "none",
                background: "#3545D6",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
