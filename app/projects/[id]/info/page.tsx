import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building04Icon, Money02Icon, UserMultipleIcon, Mail01Icon, BrowserIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default async function ProjectInfoPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: currentOrganizationId },
    include: {
      clientCompany: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      client: { select: { id: true, name: true } },
      emailAccountCompany: { select: { id: true, name: true } },
      forms: { orderBy: { createdAt: "desc" } },
      campaigns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return notFound();

  const associations = [
    project.clientCompany && { icon: Building04Icon, color: "#3545D6", bg: "#EBEDFA", label: "Empresa asociada", name: project.clientCompany.name, href: `/companies/${project.clientCompany.id}` },
    project.client && { icon: Money02Icon, color: "#448361", bg: "#E2F6E9", label: "Cliente recurrente", name: project.client.name, href: `/pipeline/clientes` },
    project.contact && { icon: UserMultipleIcon, color: "#0891b2", bg: "#ECFEFF", label: "Contacto asociado", name: `${project.contact.firstName} ${project.contact.lastName || ""}`, href: `/contacts` },
    project.emailAccountCompany && { icon: Mail01Icon, color: "#D9730D", bg: "#FFECD2", label: "Cuenta de correo", name: project.emailAccountCompany.name, href: `/projects/${id}/correo` },
  ].filter(Boolean) as { icon: any; color: string; bg: string; label: string; name: string; href: string }[];

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
      <div className="bg-white border border-border-subtle rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-sm">Descripción</h3>
        </div>
        <p className="text-sm text-text-secondary">{project.description || "Sin descripción."}</p>
      </div>

      <div className="bg-white border border-border-subtle rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-sm">Asociaciones</h3>
        </div>
        {associations.length === 0 ? (
          <p className="text-sm text-text-secondary">Este proyecto no tiene ninguna asociación todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {associations.map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:bg-nav-hover transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: a.bg }}>
                  <HugeiconsIcon icon={a.icon} size={16} color={a.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">{a.label}</p>
                  <p className="text-sm font-semibold text-text-primary truncate">{a.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border-subtle rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={BrowserIcon} size={18} color="#22c55e" />
            <h3 className="font-bold text-text-primary text-sm">Formularios</h3>
            <span className="ml-auto bg-gray-100 text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">{project.forms.length}</span>
          </div>
          {project.forms.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">Sin formularios vinculados</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {project.forms.map((f) => (
                <li key={f.id} className="py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary truncate">{f.name}</span>
                  <span className="text-xs text-text-secondary shrink-0">{f.isActive ? "Activo" : "Inactivo"}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/forms?projectId=${id}`} className="flex items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary mt-4 pt-4 border-t border-border-subtle">
            Ver en Formularios <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
          </Link>
        </div>

        <div className="bg-white border border-border-subtle rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Mail01Icon} size={18} color="#f97316" />
            <h3 className="font-bold text-text-primary text-sm">Campañas</h3>
            <span className="ml-auto bg-gray-100 text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">{project.campaigns.length}</span>
          </div>
          {project.campaigns.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">Sin campañas vinculadas</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {project.campaigns.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary truncate max-w-[200px]">{c.subject}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${c.status === "COMPLETED" ? "bg-green-50 text-green-700" : c.status === "SENDING" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-text-secondary"}`}>{c.status}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/campaigns?projectId=${id}`} className="flex items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary mt-4 pt-4 border-t border-border-subtle">
            Ver en Campañas <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
