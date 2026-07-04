import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export default async function BovedaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  const firstClient = await prisma.client.findFirst({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  if (firstClient) {
    redirect(`/boveda/${firstClient.id}`);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Sin clientes</h2>
        <p className="text-sm text-text-secondary mb-4">
          Usa &quot;Nuevo cliente&quot; o &quot;Agregar existente&quot; en el sidebar para empezar a guardar contraseñas.
        </p>
      </div>
    </div>
  );
}
