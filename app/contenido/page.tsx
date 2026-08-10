import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ContentClientsView from "@/src/components/content/ContentClientsView";

export default async function ContenidoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <ContentClientsView />
    </div>
  );
}
