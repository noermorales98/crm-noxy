import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { readPreview } from "@/src/lib/mcp/approval";
import { ConfirmForm } from "../confirm-form";

export const dynamic = "force-dynamic";

export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/mcp/approve/${token}`)}`);
  const preview = readPreview(token);
  if (!preview) {
    return (
      <main className="mx-auto grid max-w-lg gap-3 p-6">
        <h1 className="text-xl">Enlace no válido</h1>
        <p>Este enlace no es válido o ya caducó. Pide a la IA que genere uno nuevo.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-lg gap-4 p-6">
      <h1 className="text-xl">Confirmar escritura</h1>
      <p>{preview.summary}</p>
      <p className="text-sm text-text-secondary">
        Cliente: {preview.client}. Caduca: {new Date(preview.exp * 1000).toISOString()}.
      </p>
      <ConfirmForm token={token} />
    </main>
  );
}
