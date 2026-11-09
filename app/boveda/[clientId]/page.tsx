"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import VaultPanel from "@/src/components/vault/VaultPanel";
import VaultClientSearch from "@/src/components/vault/VaultClientSearch";

export default function BovedaClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { resetState } = useHeader();
  const [clientName, setClientName] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return () => resetState();
  }, []); // eslint-disable-line

  useEffect(() => {
    async function loadClient() {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const clients = await res.json();
        setAllClients(clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        const client = clients.find((c: any) => c.id === clientId);
        if (client) {
          setClientName(client.name);
        } else {
          router.replace("/boveda");
        }
      } else {
        router.replace("/boveda");
      }
      setLoading(false);
    }
    if (clientId) loadClient();
  }, [clientId, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-line border-t-action-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-4 py-3 sm:px-6">
        <VaultClientSearch clients={allClients} currentId={clientId} />
      </div>
      <VaultPanel clientId={clientId} clientName={clientName ?? undefined} />
    </div>
  );
}
