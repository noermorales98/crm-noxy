// Llamadas del navegador a la sincronización con Notion.

export type SendResult = { ok: true; message: string; url: string | null } | { ok: false; message: string };

/** Envía un deal o un documento del /kb a Notion y devuelve un texto listo para mostrar. */
export async function sendToNotion(kind: "deal" | "doc", id: string): Promise<SendResult> {
  try {
    const res = await fetch("/api/notion/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; action?: string; url?: string | null; error?: string };
    if (res.ok && data.ok) return { ok: true, message: data.action === "created" ? "Enviado a Notion." : "Actualizado en Notion.", url: data.url ?? null };
    return { ok: false, message: data.error ?? "No se pudo enviar a Notion." };
  } catch {
    return { ok: false, message: "No se pudo conectar con Notion." };
  }
}
