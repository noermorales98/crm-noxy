import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDbUnavailableError, prisma } from "@/src/lib/db";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";

export default async function BovedaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) redirect("/");

  try {
    const firstClient = await prisma.client.findFirst({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      select: { id: true },
    });

    if (firstClient) {
      redirect(`/boveda/${firstClient.id}`);
    }
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return (
      <div className="crm-mobile-bottom-clearance flex flex-1 flex-col">
        <DbUnavailableNotice />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-text-secondary">
            No se pudo cargar la bóveda ahora. Reintenta en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary">Sin clientes</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Usa &quot;Nuevo cliente&quot; o &quot;Agregar existente&quot; en el sidebar para empezar a guardar contraseñas.
        </p>
      </div>
    </div>
  );
}
