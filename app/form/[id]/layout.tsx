import { prisma } from "@/src/lib/db";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    select: { name: true, description: true },
  });
  const name = form?.name?.trim();
  return shareMetadata({
    title: name ? `Formulario — ${name}` : "Formulario",
    description: form?.description?.trim() || (name ? `Completa el formulario ${name}.` : "Formulario compartido."),
    path: `/form/${id}`,
  });
}

export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
