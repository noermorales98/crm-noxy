"use client";

import { usePathname } from "next/navigation";
import HomeDashboardShell from "@/src/components/HomeDashboardShell";
import { isPublicRoute } from "@/src/components/AppShell";
import { useThemeBoot } from "@/src/context/CrmThemeContext";
import { Skeleton } from "@/src/components/ui";

function ContentSkeleton() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Skeleton shape="stats" label="Cargando la pantalla" />
      <Skeleton shape="rows" count={6} />
    </main>
  );
}

/**
 * Mientras el servidor prepara una pantalla. En las pantallas del CRM el marco (barra lateral incluida) ya viene del layout y solo
 * el contenido espera. El Inicio (`/`) trae su propio marco dentro de la página, así que aquí se pinta con la barra lateral real.
 * En pantallas públicas (login, formularios, landing) no se muestra nada.
 */
export default function Loading() {
  const pathname = usePathname() ?? "";
  const signedIn = useThemeBoot().org !== null;
  if (!signedIn) return null;
  if (pathname === "/") {
    return (
      <HomeDashboardShell>
        <ContentSkeleton />
      </HomeDashboardShell>
    );
  }
  if (isPublicRoute(pathname)) return null;
  return <ContentSkeleton />;
}
