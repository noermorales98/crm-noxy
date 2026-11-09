"use client";

import { useState } from "react";
import { confirmPreviewAction } from "./actions";

export function ConfirmForm({ token }: { token: string }) {
  const [approval, setApproval] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    setError(null);
    const result = await confirmPreviewAction(token);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setApproval(result.approvalToken);
  }

  if (approval) {
    return (
      <div className="grid gap-3">
        <p>Copia este token y devuélveselo a la IA como approvalToken.</p>
        <code className="block break-all rounded-md bg-surface-sidebar p-3 text-sm">{approval}</code>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? <p role="status">{error}</p> : null}
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="w-fit rounded-md bg-action-primary px-4 py-2 text-action-primary-foreground"
      >
        {pending ? "Confirmando…" : "Confirmar"}
      </button>
    </div>
  );
}
