import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDbUnavailableError, prisma } from "@/src/lib/db";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";
import { DataTable, EmptyState, Enter, PageHeader, StatStrip } from "@/src/components/ui";
import { ContactAvatar } from "@/src/components/ui/EntityIcon";

type VaultRow = { id: string; name: string; company: string | null; entries: number; updatedAt: Date };

export default async function BovedaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) redirect("/");

  let rows: VaultRow[];
  try {
    const clients = await prisma.client.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, updatedAt: true, company: { select: { name: true } }, _count: { select: { vaultEntries: true } } },
    });
    rows = clients.map((client) => ({ id: client.id, name: client.name, company: client.company?.name ?? null, entries: client._count.vaultEntries, updatedAt: client.updatedAt }));
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return (
      <div className="crm-mobile-bottom-clearance flex flex-1 flex-col">
        <DbUnavailableNotice />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-text-secondary">No se pudo cargar la bóveda ahora. Reintenta en unos minutos.</p>
        </div>
      </div>
    );
  }

  const totalEntries = rows.reduce((sum, row) => sum + row.entries, 0);
  const withoutEntries = rows.filter((row) => row.entries === 0).length;
  const open = (row: VaultRow) => (
    <Link
      href={`/boveda/${row.id}`}
      className="inline-flex min-h-11 items-center rounded-control border border-line px-3 text-sm font-medium text-text-primary hover:bg-nav-hover lg:min-h-9"
    >
      Abrir
    </Link>
  );

  const columns = [
    {
      key: "name",
      header: "Cliente",
      render: (row: VaultRow) => (
        <Link href={`/boveda/${row.id}`} className="flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <ContactAvatar />
          <span className="truncate font-medium text-text-primary">{row.name}</span>
        </Link>
      ),
    },
    { key: "company", header: "Empresa", render: (row: VaultRow) => <span className="text-text-secondary">{row.company ?? "—"}</span> },
    { key: "entries", header: "Credenciales", align: "right" as const, render: (row: VaultRow) => row.entries },
    {
      key: "updated",
      header: "Actualizado",
      render: (row: VaultRow) => <span className="text-text-secondary">{row.updatedAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    { key: "actions", header: "Acciones", align: "right" as const, render: open },
  ];

  return (
    <main className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader title="Bóveda" subtitle="Credenciales y accesos de tus clientes, guardados por cliente." />
      </Enter>
      <Enter index={1}>
        <StatStrip
          items={[
            { label: "Clientes", value: rows.length },
            { label: "Credenciales guardadas", value: totalEntries },
            { label: "Sin credenciales", value: withoutEntries },
          ]}
        />
      </Enter>
      <Enter index={2}>
        <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
          <DataTable
            label="Clientes de la bóveda"
            columns={columns}
            rows={rows}
            getKey={(row: VaultRow) => row.id}
            mobileRow={(row: VaultRow) => (
              <div className="flex w-full min-w-0 items-center gap-3">
                <ContactAvatar />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">{row.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{row.entries} credenciales{row.company ? ` · ${row.company}` : ""}</span>
                </span>
                {open(row)}
              </div>
            )}
            empty={<EmptyState title="Sin clientes" body='Usa "Nuevo cliente" o "Agregar existente" en el sidebar para empezar a guardar contraseñas.' />}
          />
        </section>
      </Enter>
    </main>
  );
}
