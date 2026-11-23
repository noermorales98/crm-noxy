import { Skeleton } from "@/src/components/ui";

/** Mientras el servidor prepara una pantalla: el marco ya está pintado (viene del layout), solo el contenido espera. */
export default function Loading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Skeleton shape="stats" label="Cargando la pantalla" />
      <Skeleton shape="rows" count={6} />
    </main>
  );
}
