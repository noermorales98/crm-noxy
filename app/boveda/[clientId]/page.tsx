"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import VaultPanel from "@/src/components/vault/VaultPanel";

export default function BovedaClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { setConfig, resetState } = useHeader();
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setConfig({
      searchPlaceholder: "Buscar en bóveda…",
    });
    return () => resetState();
  }, []); // eslint-disable-line

  useEffect(() => {
    async function loadClient() {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const clients = await res.json();
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
        <div className="w-6 h-6 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return <VaultPanel clientId={clientId} clientName={clientName ?? undefined} />;
}
